import { createClient } from '@/lib/supabase/server'
import CustomerTable from '@/components/customers/CustomerTable'
import { countAllSegments } from '@/lib/actions/segments'
import { normalizeRules, applyGroupFilters, type RuleGroup } from '@/lib/filter-utils'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    segmentId?: string;
    plan?: string;
    ga4?: string;
    trial?: string;
    package?: string;
  }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const search = params.search || ""
  const segmentId = params.segmentId || ""
  const plan = params.plan || ""
  const ga4 = params.ga4 || ""
  const trial = params.trial || ""
  const pkg = params.package || ""
  const pageSize = 20

  const supabase = await createClient()

  // 1. Fetch all segments for the dropdown
  const { data: segments } = await supabase.from('dynamic_segments').select('*')

  // 2. Calculate segment counts in parallel with main query
  const [segmentCounts] = await Promise.all([
    countAllSegments()
  ])

  // 3. Build main query with filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let mainQuery = supabase.from('customer_profiles').select('*', { count: 'exact' })

  // Text search
  if (search) {
    mainQuery = mainQuery.or(`biz_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  // Direct Filters (Only if no segment is selected)
  if (!segmentId) {
    if (plan) mainQuery = mainQuery.eq('current_plan', plan)
    if (trial) mainQuery = mainQuery.eq('biz_status', trial)
    if (ga4 === 'yes') mainQuery = mainQuery.gt('total_visitors_all_time', 0)
    else if (ga4 === 'no') mainQuery = mainQuery.eq('total_visitors_all_time', 0)
    if (pkg) mainQuery = mainQuery.filter('transactions', 'cs', JSON.stringify([{ package_name: pkg }]))
  } else if (segments) {
    // Segment-based filtering using new recursive filter logic
    const activeSegment = segments.find((s: any) => s.id === segmentId)
    if (activeSegment) {
      const normalized = normalizeRules(activeSegment.rules)
      normalized.groups.forEach((group: RuleGroup) => {
        mainQuery = applyGroupFilters(mainQuery, group)
      })
    }
  }

  const { data: customers, count, error } = await mainQuery
    .order('total_revenue_vnd', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (error) {
    console.error('SERVER_ERROR [fetchCustomers]:', JSON.stringify(error, null, 2))
  }

  // Vietnamese-aware currency parser
  const parseRevenue = (val: any) => {
    if (typeof val === 'number') return val
    if (!val) return 0
    let s = String(val).trim()
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
    else if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, '')
    const cleaned = s.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  }

  // 4. Fetch Stats (Aggregates) — Optimized for Cloud Performance
  let stats = {
    recordsFetched: 0,
    totalRevenue: 0,
    proCount: 0,
    freeCount: 0,
    miscPaidRevenue: 0
  }

  try {
    const sPageSize = 1000
    const maxToFetch = Math.min(5000, count || 5000)
    let statsData: any[] = []

    for (let sFrom = 0; sFrom < maxToFetch; sFrom += sPageSize) {
      let q = supabase
        .from('customer_profiles')
        .select('total_revenue_vnd, current_plan, transactions')

      // Re-apply same filters to stats query
      if (search) {
        q = q.or(`biz_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
      }
      if (!segmentId) {
        if (plan) q = q.eq('current_plan', plan)
        if (trial) q = q.eq('biz_status', trial)
        if (ga4 === 'yes') q = q.gt('total_visitors_all_time', 0)
        else if (ga4 === 'no') q = q.eq('total_visitors_all_time', 0)
        if (pkg) q = q.filter('transactions', 'cs', JSON.stringify([{ package_name: pkg }]))
      } else if (segments) {
        const activeSegment = segments.find((s: any) => s.id === segmentId)
        if (activeSegment) {
          const normalized = normalizeRules(activeSegment.rules)
          normalized.groups.forEach((group: RuleGroup) => {
            q = applyGroupFilters(q, group)
          })
        }
      }

      const { data, error } = await q.range(sFrom, sFrom + sPageSize - 1)
      if (error) {
        console.error(`STATS_BATCH_ERROR at offset ${sFrom}:`, error.message || JSON.stringify(error))
        break
      }
      if (data) {
        statsData = statsData.concat(data)
        if (data.length < sPageSize) break
      }
    }

    if (statsData.length > 0) {
      stats = {
        recordsFetched: statsData.length,
        totalRevenue: statsData.reduce((total, c) => total + parseRevenue(c.total_revenue_vnd), 0),
        proCount: statsData.filter(c => c.current_plan?.toUpperCase() === 'PRO').length,
        freeCount: statsData.filter(c => c.current_plan?.toUpperCase() === 'FREE').length,
        miscPaidRevenue: statsData.reduce((total, c) => {
          const trans = Array.isArray(c.transactions) ? (c.transactions as any[]) : []
          const miscAmount = trans
            .filter(t => ['ZALO_ZNS', 'GEN_AI'].includes(t.package_name?.toUpperCase()))
            .reduce((s, t) => s + parseRevenue(t.amount_vnd), 0)
          return total + miscAmount
        }, 0)
      }
    }
  } catch (err) {
    console.error('CRITICAL_STATS_ERROR:', err)
  }

  // Transform segment counts for ClientTable
  const segmentsWithCounts = (segments || []).map((seg: any) => ({
    ...seg,
    customerCount: segmentCounts[seg.id] ?? null
  }))

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 font-sans">Customer Intelligence</h1>
        <p className="text-zinc-500 font-medium tracking-tight">
          360-degree view of your users combining marketing, financial, and behavioral data.
        </p>
      </div>

      <CustomerTable
        initialData={customers || []}
        totalCount={count || stats.recordsFetched}
        currentPage={page}
        pageSize={pageSize}
        segments={segmentsWithCounts}
        stats={stats}
      />
    </div>
  )
}