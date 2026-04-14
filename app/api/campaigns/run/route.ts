import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json()
    const supabase = await createClient()

    // 1. Get the Edge Function URL from env or fallback
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing Supabase configuration")
    }

    const functionUrl = `${SUPABASE_URL}/functions/v1/campaign-executor`

    // 2. Call the Edge Function
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        trigger_type: "bulk"
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Execution failed" }, { status: response.status })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error("Campaign Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
