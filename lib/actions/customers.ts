"use server"

import { createClient } from "@/lib/supabase/server"

export async function exportCustomersToCSV(params: {
  search?: string;
  segmentId?: string;
  plan?: string;
  ga4?: string;
  trial?: string;
  package?: string;
}) {
  const supabase = await createClient()

  // 1. Fetch segments if needed for rule evaluation
  const { data: segments } = await supabase.from('dynamic_segments').select('*')

  // 2. Build Query (Reusing logic from page.tsx)
  let query: any = supabase.from('customer_profiles').select('*')

  if (params.search) {
    query = query.or(`biz_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`)
  }

  if (!params.segmentId) {
    if (params.plan && params.plan !== 'all') query = query.eq('current_plan', params.plan)
    if (params.trial && params.trial !== 'all') query = query.eq('biz_status', params.trial)
    if (params.ga4 === 'yes') query = query.gt('total_visitors_all_time', 0)
    else if (params.ga4 === 'no') query = query.eq('total_visitors_all_time', 0)
    if (params.package && params.package !== 'all') {
      query = query.filter('transactions', 'cs', JSON.stringify([{ package_name: params.package }]))
    }
  }

  if (params.segmentId && params.segmentId !== 'all' && segments) {
    const activeSegment = segments.find(s => s.id === params.segmentId)
    if (activeSegment && Array.isArray(activeSegment.rules)) {
      activeSegment.rules.forEach((rule: any) => {
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
            // PAST-oriented logic (Targeting historical events like conversion_date)
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
  }

  // 3. Limit to 5000 for safety and order
  const { data: customers, error } = await query
    .order('total_revenue_vnd', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('Export Fetch Error:', error)
    throw new Error(error.message)
  }

  if (!customers || customers.length === 0) {
    return "No data found matching current filters."
  }

  // 4. Transform to CSV
  const headers = [
    "Business Name", "Phone", "Email", "Current Plan", "Status", 
    "Total Revenue (VND)", "Marketing Source", "Marketing Medium", "Marketing Campaign",
    "Total Visitors (All Time)", "Modules Used", "Last Expiry Date", "Conversion Date"
  ]

  const rows = customers.map((c: any) => {
    // Simplify modules usage
    const modules = Array.isArray(c.module_usage) 
      ? c.module_usage.map((m: any) => m.title).join('; ')
      : ""

    return [
      `"${(c.biz_name || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "")}"`,
      `"${(c.email || "")}"`,
      `"${(c.current_plan || "FREE")}"`,
      `"${(c.biz_status || "Unknown")}"`,
      c.total_revenue_vnd || 0,
      `"${(c.marketing_source || "Organic")}"`,
      `"${(c.marketing_medium || "-")}"`,
      `"${(c.marketing_campaign || "-")}"`,
      c.total_visitors_all_time || 0,
      `"${modules.replace(/"/g, '""')}"`,
      `"${c.last_expiry_date || "-"}"`,
      `"${c.conversion_date || "-"}"`
    ]
  })

  const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
  return csvContent
}
