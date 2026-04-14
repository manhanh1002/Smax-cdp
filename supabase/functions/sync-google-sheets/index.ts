import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "https://esm.sh/google-auth-library@9.0.0"

const SHEET_ID = "1Ju5A-i1G9vL1MLx6Vfja1vCYW5lZIgygLDle7Gn4wVg"

function parseDate(dateStr: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d.toISOString()
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

function parseVnNumber(val: string) {
  if (!val) return 0
  // Handle Vietnamese format: 191.523,74
  // 1. Remove dots (thousand separators)
  // 2. Replace comma with dot (decimal separator)
  // 3. Keep only numbers and the dot
  const cleaned = val
    .toString()
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
  return parseFloat(cleaned) || 0
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL")!
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n")

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const token = await auth.getAccessToken()

    const fetchSheet = async (range: string) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.token}` },
      })
      return await res.json()
    }

    // Tab 1 & 2 (Biz Plans and Purchased Plans) are now handled directly via n8n Webhook Ingestion.
    // We only need to sync the Leads Marketing tab from Google Sheets.

    // 3. Tab 3: "Leads marketing"
    console.log("Fetching Leads marketing from Google Sheets...")
    const leadsData = await fetchSheet("Leads marketing!A2:J")
    if (leadsData.values) {
      const rows = leadsData.values.map((row: any[]) => ({
        external_id: `lead_${row[1]}_${row[0]}`,
        lead_name: row[2] || "",
        email: "",
        phone: row[5] ? row[5].toString().replace(/\D/g, "") : "", // Keep only digits
        source: row[8] || "",
        campaign: row[3] || "",
        created_at: parseDate(row[0]),
      }))
      
      console.log(`Upserting ${rows.length} leads...`)
      const { error: upsertError } = await supabase
        .from("marketing_leads")
        .upsert(rows, { onConflict: "external_id" })
      
      if (upsertError) {
        throw new Error(`Leads Sync Error: ${upsertError.message}`)
      }
    }

    return new Response(JSON.stringify({ 
      message: "Sheet Lead Sync complete",
      received: leadsData.values?.length || 0
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
