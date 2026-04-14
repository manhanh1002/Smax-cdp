import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "https://esm.sh/google-auth-library@9.0.0"

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { campaign_id, customer_id, trigger_type } = await req.json()

    if (!campaign_id) throw new Error("Missing campaign_id")

    // 1. Fetch Campaign and Segment
    const { data: campaign, error: cError } = await supabase
      .from('campaigns')
      .select('*, dynamic_segments(*)')
      .eq('id', campaign_id)
      .single()

    if (cError || !campaign) throw new Error("Campaign not found")

    // 2. Execution Logic
    if (trigger_type === 'bulk') {
       return await handleBulkExecution(supabase, campaign)
    } else if (trigger_type === 'realtime') {
       if (!customer_id) throw new Error("Missing customer_id for realtime trigger")
       return await handleRealtimeExecution(supabase, campaign, customer_id)
    }

    throw new Error("Invalid trigger_type")

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})

async function handleBulkExecution(supabase: any, campaign: any) {
  const segment = campaign.dynamic_segments
  if (!segment) throw new Error("No segment linked to campaign")

  // Build query dynamically from rules
  let query = supabase.from('customer_profiles').select('*')
  
  if (Array.isArray(segment.rules)) {
    segment.rules.forEach((rule: any) => {
      const { field, operator, value } = rule
      
      if (operator === 'is_any') {
        if (field === 'module_used') query = query.neq('module_usage', '[]' as any)
        else query = query.not(field, 'is', null)
        return
      }
      if (operator === 'is_empty') {
        if (field === 'module_used') query = query.eq('module_usage', '[]' as any)
        else query = query.is(field, null)
        return
      }

      if (field === 'module_used') {
        const moduleTitles = Array.isArray(value) ? value : [value]
        moduleTitles.forEach(title => {
          query = query.filter('module_usage', 'cs', JSON.stringify([{ title }]))
        })
        return
      }

      if (field.includes('date')) {
        const days = parseInt(value) || 30
        const now = new Date()

        if (field.includes('expiry')) {
          // FUTURE-oriented logic (Targeting upcoming/past expiries)
          if (operator === 'within_last') {
            // Within next X days: Today <= expiry <= Today + X
            const futureDate = new Date()
            futureDate.setDate(now.getDate() + days)
            query = query.gte(field, now.toISOString()).lte(field, futureDate.toISOString())
          } else if (operator === 'older_than') {
            // Already expired: expiry < Today
            query = query.lt(field, now.toISOString())
          }
        } else {
          // PAST-oriented logic (Targeting historical events)
          const pastDate = new Date()
          pastDate.setDate(now.getDate() - days)
          const isoDate = pastDate.toISOString()
          if (operator === 'within_last') query = query.gte(field, isoDate)
          else if (operator === 'older_than') query = query.lt(field, isoDate)
        }
        return
      }

      if (operator === 'in') {
        const vals = Array.isArray(value) ? value : [value]
        query = query.in(field, vals)
        return
      }

      switch (operator) {
        case '==': query = query.eq(field, value); break;
        case '!=': query = query.neq(field, value); break;
        case '>=': query = query.gte(field, value); break;
        case '<=': query = query.lte(field, value); break;
        case 'contains': query = query.ilike(field, `%${value}%`); break;
      }
    })
  }

  // Fetch FULL segment (limit to a safe max like 5000 to prevent edge function timeout)
  const { data: customers, error } = await query
    .order('total_revenue_vnd', { ascending: false })
    .limit(5000) 

  if (error) throw error
  if (!customers || customers.length === 0) {
    return new Response(JSON.stringify({ message: "No customers found in segment" }))
  }

  const executionResults: { external_id: string, success: boolean, error?: string }[] = []

  // Pre-process customers to merge module_usage by unique title
  const processedCustomers = customers.map(c => {
    const moduleMap: Record<string, { title: string, users: number, events: number }> = {}
    
    if (Array.isArray(c.module_usage)) {
      c.module_usage.forEach((m: any) => {
        const title = m.title || "Unknown"
        if (!moduleMap[title]) {
          moduleMap[title] = { title, users: 0, events: 0 }
        }
        moduleMap[title].users += (m.users || 0)
        moduleMap[title].events += (m.events || 0)
      })
    }

    const uniqueModules = Object.values(moduleMap)
    const usageSummary = uniqueModules
      .map(m => `${m.title} (U: ${m.users}, E: ${m.events})`)
      .join(", ")

    return {
      ...c,
      product_usage_summary: usageSummary,
      product_usage_detailed: uniqueModules
    }
  })

  if (campaign.action_type === 'googlesheet') {
    // 1. Process Google Sheets in a single BATCH (Optimization for rate limits)
    const success = await executeGoogleSheetBatch(
      campaign.action_config.spreadsheet_id, 
      campaign.action_config.sheet_name, 
      processedCustomers
    )
    
    processedCustomers.forEach(c => {
      executionResults.push({ 
        external_id: c.external_id, 
        success, 
        error: success ? null : 'Batch sync to Sheets failed' 
      })
    })
  } else {
    // 2. Individual processing for Webhooks (n8n, etc.)
    for (const customer of processedCustomers) {
      const success = await processAction(campaign, customer)
      executionResults.push({
        external_id: customer.external_id,
        success,
        error: success ? null : 'Webhook destination returned error'
      })
    }
  }

  // 3. Batch Log Execution History (Efficient)
  const logs = executionResults.map(res => ({
    campaign_id: campaign.id,
    external_id: res.external_id,
    status: res.success ? 'success' : 'failed',
    error: res.error
  }))
  
  await supabase.from('campaign_logs').insert(logs)

  // 4. Update campaign status
  await supabase.from('campaigns').update({ 
    last_run: new Date().toISOString(),
    status: 'completed'
  }).eq('id', campaign.id)

  const finalSuccessCount = executionResults.filter(r => r.success).length

  return new Response(JSON.stringify({ 
    message: "Bulk execution finished", 
    processed: customers.length,
    success: finalSuccessCount,
    failed: customers.length - finalSuccessCount
  }))
}

async function handleRealtimeExecution(supabase: any, campaign: any, customer_id: string) {
  const segment = campaign.dynamic_segments
  if (!segment) throw new Error("No segment linked to campaign")

  // 1. Fetch customer data
  const { data: customer, error: cError } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('external_id', customer_id)
    .single()

  if (cError || !customer) throw new Error("Customer not found")

  // 2. Evaluate rules in JS
  let matches = true
  if (Array.isArray(segment.rules)) {
    // Note: We use matches = matches && ... logic for AND match type
    // Real implementation should respect segment.match_type (AND/OR)
    for (const rule of segment.rules) {
      const isMatch = evaluateRule(customer, rule)
      if (segment.match_type === 'OR') {
        if (isMatch) { matches = true; break; }
        matches = false
      } else {
        if (!isMatch) { matches = false; break; }
      }
    }
  }

  if (!matches) {
     return new Response(JSON.stringify({ message: "Customer no longer matches segment" }))
  }

  // 3. Process
  const success = await processAction(campaign, customer)

  // 4. Log
  await supabase.from('campaign_logs').insert({
    campaign_id: campaign.id,
    external_id: customer.external_id,
    status: success ? 'success' : 'failed',
    error: success ? null : 'Action failed'
  })

  return new Response(JSON.stringify({ success, message: "Realtime execution finished" }))
}

function evaluateRule(customer: any, rule: any) {
  const { field, operator, value } = rule
  const actualValue = customer[field]

  if (operator === 'is_any') return actualValue !== null && actualValue !== undefined
  if (operator === 'is_empty') return actualValue === null || actualValue === undefined

  if (field === 'module_used') {
    const usage = Array.isArray(customer.module_usage) ? customer.module_usage : []
    const moduleTitles = Array.isArray(value) ? value : [value]
    return moduleTitles.every(title => usage.some((m: any) => m.title === title))
  }

  if (field.includes('date')) {
    const days = parseInt(value) || 30
    const now = new Date()
    const recordDate = actualValue ? new Date(actualValue) : null
    
    if (!recordDate) return operator === 'is_empty'

    if (field.includes('expiry')) {
      // Future aware
      if (operator === 'within_last') {
        const futureDate = new Date()
        futureDate.setDate(now.getDate() + days)
        return recordDate >= now && recordDate <= futureDate
      }
      if (operator === 'older_than') {
        return recordDate < now
      }
    } else {
      // Past aware
      const pastDate = new Date()
      pastDate.setDate(now.getDate() - days)
      if (operator === 'within_last') return recordDate >= pastDate && recordDate <= now
      if (operator === 'older_than') return recordDate < pastDate
    }
    return false
  }

  // Simple operators
  switch (operator) {
    case '==': return actualValue == value
    case '!=': return actualValue != value
    case '>=': return actualValue >= value
    case '<=': return actualValue <= value
    case 'contains': return String(actualValue).toLowerCase().includes(String(value).toLowerCase())
    case 'in': return Array.isArray(value) ? value.includes(actualValue) : false
    default: return true
  }
}

async function processAction(campaign: any, data: any) {
  const { action_type, action_config } = campaign

  if (action_type === 'n8n') {
    return await executeWebhook(action_config.webhook_url, data, action_config.method || 'POST')
  } else if (action_type === 'googlesheet') {
    return await executeGoogleSheetBatch(action_config.spreadsheet_id, action_config.sheet_name, [data])
  }

  return false
}

async function executeGoogleSheetBatch(spreadsheetId: string, sheetName: string, customers: any[]) {
  try {
    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL")!
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n")

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const token = await auth.getAccessToken()
    
    // 1. Check if we need to add headers
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:A1`
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token.token}` }
    })
    const sheetData = await getRes.json()
    const needsHeader = !sheetData.values || sheetData.values.length === 0

    const headers = [
      "External ID", "Business Name", "Phone", "Email", "Alias URL", 
      "Current Plan", "Status", "Total Revenue (VND)", "Marketing Source", 
      "Marketing Campaign", "Total Visitors", "Total Events", "Product Usage (GA4)", "Export Date"
    ]

    const rows = customers.map(data => [
      data.external_id || "",
      data.biz_name || "",
      data.phone || "",
      data.email || "",
      data.alias_url || "",
      data.current_plan || "",
      data.biz_status || "",
      data.total_revenue_vnd || 0,
      data.marketing_source || "",
      data.marketing_campaign || "",
      data.total_visitors_all_time || 0,
      data.total_events_all_time || 0,
      data.product_usage_summary || "",
      new Date().toISOString()
    ])

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A:append?valueInputOption=USER_ENTERED`
    
    const valuesToPush = needsHeader ? [headers, ...rows] : rows

    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: valuesToPush
      })
    })

    if (!res.ok) {
        const errorText = await res.text()
        console.error('Google Sheets Error:', errorText)
        return false
    }
    return true
  } catch (e) {
    console.error('Google Sheets Critical Error:', e)
    return false
  }
}

async function executeWebhook(url: string, data: any, method: string = 'POST') {
  try {
    let finalUrl = url
    let options: any = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }

    if (method === 'GET') {
      const params = new URLSearchParams()
      Object.keys(data).forEach(key => {
        const val = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]
        params.append(key, val)
      })
      finalUrl += (url.includes('?') ? '&' : '?') + params.toString()
    } else {
      options.body = JSON.stringify(data)
    }

    const res = await fetch(finalUrl, options)
    if (!res.ok) {
        console.error(`Webhook Error [${res.status}]:`, await res.text().catch(() => 'No body'))
    }
    return res.ok
  } catch (e) {
    console.error('Webhook Critical Exception:', e)
    return false
  }
}
