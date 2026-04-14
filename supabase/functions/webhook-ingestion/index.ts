import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

function parseDate(dateStr: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d.toISOString()
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split(/[\/\- ]/)
  if (parts.length >= 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    const d2 = new Date(year, month, day)
    if (!isNaN(d2.getTime())) return d2.toISOString()
  }
  return null
}

function parseVnNumber(val: any) {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  
  // Handle Vietnamese format: 191.523,74
  const cleaned = val
    .toString()
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
  return parseFloat(cleaned) || 0
}

serve(async (req) => {
  // 1. Basic Auth Check
  const authHeader = req.headers.get("X-Webhook-Secret")
  const secret = Deno.env.get("WEBHOOK_SECRET")

  if (secret && authHeader !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    })
  }

  try {
    // Fallback to internal docker network URL to avoid hairpin NAT / DNS issues on self-hosted VPS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.includes('crm-db.cdp.vn') 
      ? 'http://kong:8000' 
      : (Deno.env.get("SUPABASE_URL") || 'http://kong:8000')

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const payload = await req.json()
    const { type, data } = payload

    if (!type || !data) {
      throw new Error("Missing type or data in payload")
    }

    let result;

    if (type === "biz_plan") {
      // Logic for biz_plans
      const conversionDate = parseDate(data.conversion_date)
      const externalId = data.external_id || `biz_${data.biz_name}_${conversionDate}`

      const row = {
        external_id: externalId,
        biz_name: data.biz_name,
        email: data.email || "",
        phone: data.phone || "",
        conversion_date: conversionDate,
        alias_url: data.alias_url || "",
        website: data.website || "",
        company_size: data.company_size || "",
        account_email: data.account_email || "",
        trial_expiry: parseDate(data.trial_expiry),
        status: data.status || "",
        sales_rep: data.sales_rep || "",
        source: data.source || "",
        field: data.field || "",
        expected_revenue: data.expected_revenue ? parseVnNumber(data.expected_revenue) : 0,
        purchase_count: parseInt(String(data.purchase_count || "0")),
      }

      result = await supabase.from("biz_plans").upsert(row, { onConflict: "external_id" })
    } 
    else if (type === "purchased_plan") {
      // Logic for purchased_plans
      const purchaseDate = parseDate(data.purchase_date)
      const orderId = data.order_id || `ord_${purchaseDate}_${data.biz_name}`

      const row = {
        order_id: orderId,
        biz_name: data.biz_name,
        alias_url: data.alias_url || "",
        package_name: data.package_name || "",
        is_first_purchase: !!data.is_first_purchase,
        amount_usd: parseVnNumber(data.amount_usd),
        amount_vnd: parseVnNumber(data.amount_vnd),
        purchase_date: purchaseDate,
        expiry_date: parseDate(data.expiry_date),
      }

      result = await supabase.from("purchased_plans").upsert(row, { onConflict: "order_id" })
    } 
    else {
      throw new Error(`Unsupported type: ${type}`)
    }

    if (result.error) throw result.error

    return new Response(JSON.stringify({ message: "Ingestion successful", type }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
