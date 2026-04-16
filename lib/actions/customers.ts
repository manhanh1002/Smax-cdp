"use server"

import { createClient } from "@/lib/supabase/server"
import { normalizeRules, applyGroupFilters, type RulesFormat, type RuleGroup } from "@/lib/filter-utils"

export async function exportCustomersToCSV(params: {
  search?: string;
  segmentId?: string;
  plan?: string;
  ga4?: string;
  trial?: string;
  package?: string;
}) {
  const supabase = await createClient()

  // 1. Fetch segments if needed
  const { data: segments } = await supabase.from('dynamic_segments').select('*')

  // 2. Build Query
  let query: any = supabase.from('customer_profiles').select('*')

  // Text search
  if (params.search) {
    query = query.or(`biz_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`)
  }

  // Direct filters (when no segment is selected)
  if (!params.segmentId) {
    if (params.plan && params.plan !== 'all') query = query.eq('current_plan', params.plan)
    if (params.trial && params.trial !== 'all') query = query.eq('biz_status', params.trial)
    if (params.ga4 === 'yes') query = query.gt('total_visitors_all_time', 0)
    else if (params.ga4 === 'no') query = query.eq('total_visitors_all_time', 0)
    if (params.package && params.package !== 'all') {
      query = query.filter('transactions', 'cs', JSON.stringify([{ package_name: params.package }]))
    }
  }

  // Segment filter
  if (params.segmentId && params.segmentId !== 'all' && segments) {
    const activeSegment = segments.find((s: any) => s.id === params.segmentId)
    if (activeSegment) {
      const normalized = normalizeRules(activeSegment.rules)
      normalized.groups.forEach((group: RuleGroup) => {
        query = applyGroupFilters(query, group)
      })
    }
  }

  // 3. Limit and order
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
    const modules = Array.isArray(c.module_usage)
      ? c.module_usage.map((m: any) => m.title).join('; ')
      : ""

    return [
      `"${(c.biz_name || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "")}"`,
      `"${(c.email || "")}"`,
      `"${c.current_plan || "FREE"}"`,
      `"${c.biz_status || "Unknown"}"`,
      c.total_revenue_vnd || 0,
      `"${c.marketing_source || "Organic"}"`,
      `"${c.marketing_medium || "-"}"`,
      `"${c.marketing_campaign || "-"}"`,
      c.total_visitors_all_time || 0,
      `"${modules.replace(/"/g, '""')}"`,
      `"${c.last_expiry_date || "-"}"`,
      `"${c.conversion_date || "-"}"`
    ]
  })

  const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
  return csvContent
}