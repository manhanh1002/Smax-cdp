import { createClient } from '@/lib/supabase/server'
import CustomerTable from '@/components/customers/CustomerTable'
import { countAllSegments } from '@/lib/actions/segments'
import { normalizeRules, applyGroupFilters, type RuleGroup } from '@/lib/filter-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRevenue(val: any): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  let s = String(val).trim()
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  else if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, '')
  return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0
}

function computeStats(statsData: any[]) {
  if (!statsData || statsData.length === 0) {
    return { recordsFetched: 0, totalRevenue: 0, proCount: 0, freeCount: 0, miscPaidRevenue: 0 }
  }
  let miscPaidRevenue = 0
  statsData.forEach(c => {
    const trans = Array.isArray(c.transactions) ? c.transactions : []
    trans.forEach((t: any) => {
      if (['ZALO_ZNS', 'GEN_AI'].includes(t.package_name?.toUpperCase())) {
        miscPaidRevenue += parseRevenue(t.amount_vnd)
      }
    })
  })
  return {
    recordsFetched: statsData.length,
    totalRevenue: statsData.reduce((total, c) => total + parseRevenue(c.total_revenue_vnd), 0),
    proCount: statsData.filter(c => c.current_plan?.toUpperCase() === 'PRO').length,
    freeCount: statsData.filter(c => c.current_plan?.toUpperCase() === 'FREE').length,
    miscPaidRevenue,
  }
}

function applyFilters(
  qb: any,
  opts: {
    search: string; segmentId: string; plan: string; trial: string; ga4: string; pkg: string; segments: any[]
  }
) {
  if (opts.search) {
    qb = qb.or(`biz_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%,email.ilike.%${opts.search}%`)
  }
  if (!opts.segmentId) {
    if (opts.plan) qb = qb.eq('current_plan', opts.plan)
    if (opts.trial) qb = qb.eq('biz_status', opts.trial)
    if (opts.ga4 === 'yes') qb = qb.gt('total_visitors_all_time', 0)
    else if (opts.ga4 === 'no') qb = qb.eq('total_visitors_all_time', 0)
    if (opts.pkg) qb = qb.filter('transactions', 'cs', JSON.stringify([{ package_name: opts.pkg }]))
  } else if (opts.segments.length > 0) {
    const activeSegment = opts.segments.find((s: any) => s.id === opts.segmentId)
    if (activeSegment) {
      const normalized = normalizeRules(activeSegment.rules)
      normalized.groups.forEach((group: RuleGroup) => {
        qb = applyGroupFilters(qb, group)
      })
    }
  }
  return qb
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; search?: string; segmentId?: string;
    plan?: string; ga4?: string; trial?: string; package?: string;
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
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()

  // Step 1: Fetch segments (small table, fast) — needed for segment filter
  const { data: segments } = await supabase
    .from('dynamic_segments')
    .select('*')

  const segList = segments || []
  const filterOpts = { search, segmentId, plan, trial, ga4, pkg, segments: segList }

  // Step 2: Run heavy queries in PARALLEL
  const [
    { data: customers, count, error },
    statsData,
    segmentCounts,
  ] = await Promise.all([
    // Main paginated query
    (async () => {
      let q = supabase.from('customer_profiles').select('*', { count: 'exact' })
      q = applyFilters(q, filterOpts)
      return q.order('total_revenue_vnd', { ascending: false, nullsFirst: false }).range(from, to)
    })(),
    // Stats: 1 batch up to 5000 rows (no loop)
    (async () => {
      let q = supabase.from('customer_profiles').select('total_revenue_vnd, current_plan, transactions')
      q = applyFilters(q, filterOpts)
      const { data } = await q.range(0, 4999)
      return data || []
    })(),
    // Count all segments in parallel
    countAllSegments(),
  ])

  if (error) {
    console.error('SERVER_ERROR [fetchCustomers]:', JSON.stringify(error, null, 2))
  }

  const stats = computeStats(statsData)

  const segmentsWithCounts = segList.map((seg: any) => ({
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
