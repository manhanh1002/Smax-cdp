import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "https://esm.sh/google-auth-library@9.0.0"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Authenticate with Google
    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL")!
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n")
    const propertyId = Deno.env.get("GA4_PROPERTY_ID")!

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    })

    const token = await auth.getAccessToken()

    // 2. Fetch GA4 Page-Level Report (Last 3 days to ensure completeness)
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "3daysAgo", endDate: "today" }],
        dimensions: [
          { name: "date" },
          { name: "pagePath" },
          { name: "pageTitle" }
        ],
        metrics: [
          { name: "totalUsers" },
          { name: "eventCount" }
        ],
      }),
    })

    const data = await res.json()

    if (data.error) {
       throw new Error(`GA4 API Error: ${data.error.message}`)
    }

    // 3. Process and Upsert into ga4_page_metrics
    if (data.rows) {
      const rows = data.rows.map((row: any) => {
        // Formate date from YYYYMMDD to YYYY-MM-DD
        const dateStr = row.dimensionValues[0].value
        const year = dateStr.substring(0, 4)
        const month = dateStr.substring(4, 6)
        const day = dateStr.substring(6, 8)
        const date = `${year}-${month}-${day}`

        return {
          date,
          page_path: row.dimensionValues[1].value,
          page_title: row.dimensionValues[2].value,
          total_users: parseInt(row.metricValues[0].value),
          event_count: parseInt(row.metricValues[1].value),
          synced_at: new Date().toISOString()
        }
      })

      // Upsert targeting the unique constraint (date, page_path)
      const { error: upsertError } = await supabase
        .from("ga4_page_metrics")
        .upsert(rows, { onConflict: "date,page_path" })
      
      if (upsertError) {
        throw new Error(`Supabase Upsert Error: ${upsertError.message}`)
      }
    }

    return new Response(JSON.stringify({ 
      message: "GA4 Page Sync complete", 
      received: data.rows?.length || 0 
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
