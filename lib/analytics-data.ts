import { createClient } from '@/lib/supabase/server'

// Re-export format helpers so existing imports still work
export { formatVND, formatVNDShort } from '@/lib/format-utils'

// ──────────────────────────── HELPER: FETCH ALL ROWS ────────────────────────────
// Supabase PostgREST defaults to 1,000 rows per request.
// This helper paginates through ALL rows using .range() in a loop.
const PAGE_SIZE = 1000 // Matches PostgREST server max_rows — will paginate in 1k chunks

async function fetchAllPages(queryFn: (from: number, to: number) => Promise<{ data: any[] | null; error: any }>): Promise<any[]> {
  const allRows: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('fetchAllPages error:', error)
      break
    }
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < PAGE_SIZE) break // last page reached
    from += PAGE_SIZE
  }

  return allRows
}

// ──────────────────────────── TAB 1: OVERVIEW ────────────────────────────
export async function getOverviewData() {
  const supabase = await createClient()

  // Parallel fetch ALL rows from each table
  const [biz, plans, monthlyPlans, bizWithAlias] = await Promise.all([
    // biz_plans: ~2,423 rows
    fetchAllPages(async (from, to) =>
      supabase.from('biz_plans')
        .select('status, trial_expiry, sales_rep, current_plan, alias_url')
        .range(from, to)
    ),
    // purchased_plans with amount: ~1,519 rows
    fetchAllPages(async (from, to) =>
      supabase.from('purchased_plans')
        .select('amount_vnd, is_first_purchase, purchase_date, expiry_date, package_name, alias_url')
        .not('amount_vnd', 'is', null)
        .range(from, to)
    ),
    // purchased_plans for monthly trend: ~1,519 rows
    fetchAllPages(async (from, to) =>
      supabase.from('purchased_plans')
        .select('amount_vnd, is_first_purchase, purchase_date')
        .not('amount_vnd', 'is', null)
        .not('purchase_date', 'is', null)
        .range(from, to)
    ),
    // biz_plans alias mapping: ~2,423 rows
    fetchAllPages(async (from, to) =>
      supabase.from('biz_plans')
        .select('alias_url, sales_rep')
        .range(from, to)
    ),
  ])

  console.log(`[Overview] Fetched: biz=${biz.length}, plans=${plans.length}, monthly=${monthlyPlans.length}, bizAlias=${bizWithAlias.length}`)

  if (!biz.length && !plans.length) {
    console.error('Overview data: no data returned')
    return null
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Build set of alias_urls that have actual revenue (= paying customers)
  const aliasesWithRevenue = new Set<string>()
  plans.forEach((p: any) => {
    if (p.alias_url) aliasesWithRevenue.add(p.alias_url)
  })

  // Scorecards — "Active" = has purchased plans with revenue (not status='Active' which doesn't exist)
  const activeCount = biz.filter((b: any) => b.alias_url && aliasesWithRevenue.has(b.alias_url)).length
  const trialCount = biz.filter((b: any) => b.status?.includes('trial') || b.status?.includes('Trial')).length
  const trialExpiring7d = biz.filter((b: any) => {
    if (!b.trial_expiry) return false
    const exp = new Date(b.trial_expiry)
    return exp > now && exp <= sevenDaysFromNow && (b.status?.includes('trial') || b.status?.includes('Trial') || b.status === 'Sắp hết trial')
  }).length

  const conversionRate = (activeCount + trialCount) > 0
    ? ((activeCount / (activeCount + trialCount)) * 100).toFixed(1)
    : '0'

  // MRR: sum of plans still active
  const activePlanRevenue = plans
    .filter((p: any) => p.expiry_date && new Date(p.expiry_date) >= now)
    .reduce((acc: number, p: any) => acc + (Number(p.amount_vnd) || 0), 0)

  // New vs Expansion this month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthPlans = plans.filter((p: any) => p.purchase_date && new Date(p.purchase_date) >= thisMonthStart)
  const newThisMonth = thisMonthPlans.filter((p: any) => p.is_first_purchase).length
  const expansionThisMonth = thisMonthPlans.filter((p: any) => !p.is_first_purchase).length

  // Revenue Trend (12 months) — New vs Expansion
  const monthlyMap: Record<string, { newRev: number; expRev: number }> = {}
  monthlyPlans.forEach((p: any) => {
    const d = new Date(p.purchase_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { newRev: 0, expRev: 0 }
    const amount = Number(p.amount_vnd) || 0
    if (p.is_first_purchase) monthlyMap[key].newRev += amount
    else monthlyMap[key].expRev += amount
  })
  const revenueTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({ month, ...data }))

  // Customer Status Breakdown (donut) — Paying = has revenue, not status='Active'
  const hetTrialWithRevenue = biz.filter((b: any) => b.status === 'Hết trial' && b.alias_url && aliasesWithRevenue.has(b.alias_url)).length
  const hetTrialNoRevenue = biz.filter((b: any) => b.status === 'Hết trial' && !(b.alias_url && aliasesWithRevenue.has(b.alias_url))).length
  const statusBreakdown = [
    { name: 'Paying', value: activeCount, color: '#10b981' },
    { name: 'Trial', value: biz.filter((b: any) => b.status === 'Trial').length, color: '#3b82f6' },
    { name: 'Sắp hết trial', value: biz.filter((b: any) => b.status === 'Sắp hết trial').length, color: '#f59e0b' },
    { name: 'Churned', value: hetTrialNoRevenue, color: '#f43f5e' },
  ]

  // Top 5 Sales Reps by total revenue
  const plansByAlias: Record<string, number> = {}
  plans.forEach((p: any) => {
    if (p.alias_url) {
      if (!plansByAlias[p.alias_url]) plansByAlias[p.alias_url] = 0
      plansByAlias[p.alias_url] += Number(p.amount_vnd) || 0
    }
  })

  const aliasToRep: Record<string, string> = {}
  bizWithAlias.forEach((b: any) => {
    if (b.alias_url && b.sales_rep) aliasToRep[b.alias_url] = b.sales_rep
  })

  const repRevMap: Record<string, number> = {}
  Object.entries(plansByAlias).forEach(([alias, rev]) => {
    const rep = aliasToRep[alias]
    if (rep) {
      if (!repRevMap[rep]) repRevMap[rep] = 0
      repRevMap[rep] += rev
    }
  })
  const topSalesReps = Object.entries(repRevMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue }))

  return {
    scorecards: {
      mrr: activePlanRevenue,
      activeCustomers: activeCount,
      trialExpiring: trialExpiring7d,
      conversionRate: Number(conversionRate),
      newThisMonth,
      expansionThisMonth,
    },
    revenueTrend,
    statusBreakdown,
    topSalesReps,
  }
}

// ──────────────────────────── TAB 2: REVENUE ────────────────────────────
export async function getRevenueData() {
  const supabase = await createClient()

  // Fetch ALL purchased_plans (~1,519 rows)
  const plans = await fetchAllPages(async (from, to) =>
    supabase.from('purchased_plans')
      .select('order_id, biz_name, alias_url, package_name, amount_vnd, purchase_date, expiry_date, is_first_purchase')
      .not('amount_vnd', 'is', null)
      .range(from, to)
  )

  console.log(`[Revenue] Fetched: plans=${plans.length}`)

  if (!plans.length) {
    console.error('Revenue data: no plans found')
    return null
  }

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Scorecards
  const totalRevenue = plans.reduce((s: number, p: any) => s + (Number(p.amount_vnd) || 0), 0)
  const newRevenue = plans.filter((p: any) => p.is_first_purchase).reduce((s: number, p: any) => s + (Number(p.amount_vnd) || 0), 0)
  const expansionRevenue = plans.filter((p: any) => !p.is_first_purchase).reduce((s: number, p: any) => s + (Number(p.amount_vnd) || 0), 0)
  const avgDealSize = plans.length > 0 ? totalRevenue / plans.length : 0

  // Top package
  const pkgMap: Record<string, number> = {}
  plans.forEach((p: any) => {
    const pkg = p.package_name || 'KHÁC'
    if (!pkgMap[pkg]) pkgMap[pkg] = 0
    pkgMap[pkg] += Number(p.amount_vnd) || 0
  })
  const topPackage = Object.entries(pkgMap).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

  // Expiring revenue (30 days)
  const expiringRevenue = plans
    .filter((p: any) => p.expiry_date && new Date(p.expiry_date) <= thirtyDaysFromNow && new Date(p.expiry_date) >= now)
    .reduce((s: number, p: any) => s + (Number(p.amount_vnd) || 0), 0)

  // Package Revenue Mix (monthly stacked bar)
  const pkgMonthly: Record<string, Record<string, number>> = {}
  plans.forEach((p: any) => {
    if (!p.purchase_date) return
    const d = new Date(p.purchase_date)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const pkg = p.package_name || 'KHÁC'
    if (!pkgMonthly[month]) pkgMonthly[month] = {}
    if (!pkgMonthly[month][pkg]) pkgMonthly[month][pkg] = 0
    pkgMonthly[month][pkg] += Number(p.amount_vnd) || 0
  })
  const allPackages = [...new Set(plans.map((p: any) => p.package_name || 'KHÁC'))].filter(Boolean)
  const packageMix = Object.entries(pkgMonthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, pkgs]) => ({
      month,
      ...Object.fromEntries(allPackages.map(p => [p, pkgs[p] || 0])),
    }))

  // Revenue Waterfall (New vs Expansion by month)
  const waterfallMap: Record<string, { newRev: number; expRev: number }> = {}
  plans.forEach((p: any) => {
    if (!p.purchase_date) return
    const d = new Date(p.purchase_date)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!waterfallMap[month]) waterfallMap[month] = { newRev: 0, expRev: 0 }
    const amt = Number(p.amount_vnd) || 0
    if (p.is_first_purchase) waterfallMap[month].newRev += amt
    else waterfallMap[month].expRev += amt
  })
  const revenueWaterfall = Object.entries(waterfallMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({ month, ...data }))

  // Top 20 Customers by LTV
  const customerRevMap: Record<string, { biz_name: string; total: number; count: number; plan: string }> = {}
  plans.forEach((p: any) => {
    const key = p.alias_url || p.biz_name || 'Unknown'
    if (!customerRevMap[key]) customerRevMap[key] = { biz_name: p.biz_name || key, total: 0, count: 0, plan: '' }
    customerRevMap[key].total += Number(p.amount_vnd) || 0
    customerRevMap[key].count += 1
  })
  const topCustomers = Object.values(customerRevMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  // Revenue Heatmap (daily for last 90 days)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const dailyRevMap: Record<string, number> = {}
  plans.forEach((p: any) => {
    if (!p.purchase_date) return
    const d = new Date(p.purchase_date)
    if (d >= ninetyDaysAgo) {
      const key = d.toISOString().split('T')[0]
      if (!dailyRevMap[key]) dailyRevMap[key] = 0
      dailyRevMap[key] += Number(p.amount_vnd) || 0
    }
  })
  const revenueHeatmap = Object.entries(dailyRevMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }))

  return {
    scorecards: { totalRevenue, newRevenue, expansionRevenue, avgDealSize, topPackage, expiringRevenue },
    allPackages,
    packageMix,
    revenueWaterfall,
    topCustomers,
    revenueHeatmap,
  }
}

// ──────────────────────────── TAB 3: MARKETING ────────────────────────────

// Normalize Vietnamese phone: remove country prefix '84', leading '0', non-digits
// "84909008810" → "909008810", "0909008810" → "909008810", "783173341" → "783173341"
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('84') && digits.length >= 11) return digits.slice(2)
  if (digits.startsWith('0') && digits.length >= 10) return digits.slice(1)
  return digits
}

export async function getMarketingData() {
  const supabase = await createClient()

  // Fetch ALL rows from each table
  const [leads, bizList, plansList] = await Promise.all([
    // marketing_leads: ~2,099 rows
    fetchAllPages(async (from, to) =>
      supabase.from('marketing_leads')
        .select('lead_name, phone, source, campaign, created_at')
        .range(from, to)
    ),
    // biz_plans: ~2,423 rows
    fetchAllPages(async (from, to) =>
      supabase.from('biz_plans')
        .select('phone, status, alias_url')
        .range(from, to)
    ),
    // purchased_plans: ~1,519 rows
    fetchAllPages(async (from, to) =>
      supabase.from('purchased_plans')
        .select('alias_url, amount_vnd')
        .not('amount_vnd', 'is', null)
        .range(from, to)
    ),
  ])

  console.log(`[Marketing] Fetched: leads=${leads.length}, biz=${bizList.length}, plans=${plansList.length}`)

  if (!leads.length) {
    console.error('Marketing data: no leads found')
    return null
  }

  // Build normalized phone→biz lookup (fixes "84xxx" vs "xxx" mismatch)
  const phoneToAlias: Record<string, string> = {}
  const phoneToStatus: Record<string, string> = {}
  bizList.forEach((b: any) => {
    if (b.phone) {
      const norm = normalizePhone(b.phone)
      phoneToStatus[norm] = b.status || ''
      if (b.alias_url) phoneToAlias[norm] = b.alias_url
    }
  })

  // Revenue by alias_url — and build SET of aliases with revenue (= "converted")
  const aliasRevenue: Record<string, number> = {}
  const aliasesWithRevenue = new Set<string>()
  plansList.forEach((p: any) => {
    if (p.alias_url) {
      if (!aliasRevenue[p.alias_url]) aliasRevenue[p.alias_url] = 0
      aliasRevenue[p.alias_url] += Number(p.amount_vnd) || 0
      aliasesWithRevenue.add(p.alias_url)
    }
  })

  // Helper: check if a lead is "converted" = their biz has actual revenue
  function isLeadConverted(phone: string | null): boolean {
    if (!phone) return false
    const norm = normalizePhone(phone)
    const alias = phoneToAlias[norm]
    return !!alias && aliasesWithRevenue.has(alias)
  }

  // Helper: get revenue for a lead
  function getLeadRevenue(phone: string | null): number {
    if (!phone) return 0
    const norm = normalizePhone(phone)
    const alias = phoneToAlias[norm]
    return alias ? (aliasRevenue[alias] || 0) : 0
  }

  // Lead conversion analysis — FIXED: "converted" = has real revenue, not status='Active'
  const totalLeads = leads.length
  const convertedLeads = leads.filter((l: any) => isLeadConverted(l.phone)).length
  const leadConvRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0'

  // Revenue per lead
  let totalRevFromLeads = 0
  leads.forEach((l: any) => {
    totalRevFromLeads += getLeadRevenue(l.phone)
  })
  const revenuePerLead = totalLeads > 0 ? totalRevFromLeads / totalLeads : 0

  // Best channel (source with highest conversion rate)
  const sourceStats: Record<string, { total: number; converted: number; revenue: number }> = {}
  leads.forEach((l: any) => {
    const src = l.source || 'Unknown'
    if (!sourceStats[src]) sourceStats[src] = { total: 0, converted: 0, revenue: 0 }
    sourceStats[src].total += 1
    if (isLeadConverted(l.phone)) {
      sourceStats[src].converted += 1
      sourceStats[src].revenue += getLeadRevenue(l.phone)
    }
  })
  const bestChannel = Object.entries(sourceStats)
    .filter(([, s]) => s.total >= 5)
    .sort(([, a], [, b]) => (b.converted / b.total) - (a.converted / a.total))[0]?.[0] || 'N/A'

  // Lead Volume by Source (weekly)
  const weeklySourceMap: Record<string, Record<string, number>> = {}
  const allSources = [...new Set(leads.map((l: any) => l.source || 'Unknown').filter((s: string) => s.trim()))]
  leads.forEach((l: any) => {
    if (!l.created_at) return
    const d = new Date(l.created_at)
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7)
    const weekKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    const src = l.source || 'Unknown'
    if (!weeklySourceMap[weekKey]) weeklySourceMap[weekKey] = {}
    if (!weeklySourceMap[weekKey][src]) weeklySourceMap[weekKey][src] = 0
    weeklySourceMap[weekKey][src] += 1
  })
  const leadsByWeek = Object.entries(weeklySourceMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
    .map(([week, sources]) => ({ week, ...sources }))

  // Source performance for funnel
  const sourcePerformance = Object.entries(sourceStats)
    .filter(([name]) => name.trim())
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)
    .map(([name, stats]) => ({
      name: name.length > 25 ? name.substring(0, 22) + '...' : name,
      fullName: name,
      leads: stats.total,
      converted: stats.converted,
      rate: stats.total > 0 ? Number(((stats.converted / stats.total) * 100).toFixed(1)) : 0,
    }))

  // Campaign performance scatter — FIXED: use revenue-based conversion
  const campaignStats: Record<string, { leads: number; converted: number; revenue: number }> = {}
  leads.forEach((l: any) => {
    const camp = l.campaign || 'Unknown'
    if (!campaignStats[camp]) campaignStats[camp] = { leads: 0, converted: 0, revenue: 0 }
    campaignStats[camp].leads += 1
    if (isLeadConverted(l.phone)) {
      campaignStats[camp].converted += 1
      campaignStats[camp].revenue += getLeadRevenue(l.phone)
    }
  })
  const campaignPerformance = Object.entries(campaignStats)
    .filter(([, s]) => s.leads >= 3)
    .sort(([, a], [, b]) => b.leads - a.leads)
    .slice(0, 20)
    .map(([name, stats]) => ({
      name: name.length > 30 ? name.substring(0, 27) + '...' : name,
      fullName: name,
      leads: stats.leads,
      convRate: stats.leads > 0 ? Number(((stats.converted / stats.leads) * 100).toFixed(1)) : 0,
      revenue: stats.revenue,
    }))

  console.log(`[Marketing] Conversion result: ${convertedLeads}/${totalLeads} = ${leadConvRate}%`)

  return {
    scorecards: {
      totalLeads,
      convertedLeads,
      leadConvRate: Number(leadConvRate),
      revenuePerLead,
      bestChannel,
    },
    sourcePerformance,
    campaignPerformance,
    leadsByWeek,
    topSources: allSources.filter((s: string) => s.trim()).slice(0, 8),
  }
}

// ──────────────────────────── TAB 4: PRODUCT ADOPTION ────────────────────────────
// ga4_page_metrics has 438K+ rows — use date filter + pagination
export async function getProductAdoptionData() {
  const supabase = await createClient()

  const now = new Date()
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Only fetch last 30 days (reduces from 438K to ~15-30K rows)
  const ga4Recent = await fetchAllPages(async (from, to) =>
    supabase.from('ga4_page_metrics')
      .select('page_path, page_title, total_users, event_count, date')
      .gte('date', thirtyDaysAgoStr)
      .range(from, to)
  )

  console.log(`[Product] Fetched: ga4_30d=${ga4Recent.length}`)

  // Scorecards
  const totalSessions30d = ga4Recent.reduce((s: number, g: any) => s + (g.total_users || 0), 0)
  const totalEvents30d = ga4Recent.reduce((s: number, g: any) => s + (g.event_count || 0), 0)
  const eventsPerSession = totalSessions30d > 0 ? (totalEvents30d / totalSessions30d).toFixed(1) : '0'

  // Most used module (30d)
  const moduleMap30d: Record<string, { users: number; events: number }> = {}
  ga4Recent.forEach((g: any) => {
    const mod = g.page_title || 'Unknown'
    if (!moduleMap30d[mod]) moduleMap30d[mod] = { users: 0, events: 0 }
    moduleMap30d[mod].users += g.total_users || 0
    moduleMap30d[mod].events += g.event_count || 0
  })
  const mostUsedModule = Object.entries(moduleMap30d)
    .sort(([, a], [, b]) => b.users - a.users)[0]?.[0] || 'N/A'

  // Module Usage Ranking (Top 10)
  const moduleRanking = Object.entries(moduleMap30d)
    .sort(([, a], [, b]) => b.users - a.users)
    .slice(0, 10)
    .map(([name, data]) => ({
      name: name.length > 30 ? name.substring(0, 27) + '...' : name,
      fullName: name,
      users: data.users,
      events: data.events,
    }))

  // Usage Trend by Module (daily, top 5 modules, last 30d)
  const topModules = Object.entries(moduleMap30d)
    .sort(([, a], [, b]) => b.users - a.users)
    .slice(0, 5)
    .map(([name]) => name)

  const dailyModuleMap: Record<string, Record<string, number>> = {}
  ga4Recent.forEach((g: any) => {
    const mod = g.page_title || 'Unknown'
    if (!topModules.includes(mod)) return
    const dateKey = g.date
    if (!dailyModuleMap[dateKey]) dailyModuleMap[dateKey] = {}
    if (!dailyModuleMap[dateKey][mod]) dailyModuleMap[dateKey][mod] = 0
    dailyModuleMap[dateKey][mod] += g.total_users || 0
  })
  const usageTrend = Object.entries(dailyModuleMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, modules]) => ({
      date,
      ...Object.fromEntries(topModules.map(m => [m, modules[m] || 0])),
    }))

  // Engagement Scatter
  const engagementScatter = Object.entries(moduleMap30d)
    .filter(([, d]) => d.users > 0)
    .map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 17) + '...' : name,
      fullName: name,
      sessions: data.users,
      eventsPerSession: Number((data.events / data.users).toFixed(2)),
      totalEvents: data.events,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15)

  return {
    scorecards: {
      totalSessions30d,
      mostUsedModule,
      totalEvents30d,
      bounceRateAvg: Number(eventsPerSession),
    },
    moduleRanking,
    usageTrend,
    topModules,
    engagementScatter,
  }
}

// ──────────────────────────── TAB 5: CUSTOMER LIFECYCLE ────────────────────────────
export async function getLifecycleData() {
  const supabase = await createClient()

  const [biz, plans, leads] = await Promise.all([
    // biz_plans: ~2,423 rows
    fetchAllPages(async (from, to) =>
      supabase.from('biz_plans')
        .select('biz_name, status, trial_expiry, conversion_date, sales_rep, current_plan, alias_url, phone')
        .range(from, to)
    ),
    // purchased_plans: ~1,519 rows
    fetchAllPages(async (from, to) =>
      supabase.from('purchased_plans')
        .select('alias_url, amount_vnd, expiry_date, purchase_date, package_name')
        .not('amount_vnd', 'is', null)
        .range(from, to)
    ),
    // marketing_leads for source attribution
    fetchAllPages(async (from, to) =>
      supabase.from('marketing_leads')
        .select('phone, source')
        .range(from, to)
    ),
  ])

  console.log(`[Lifecycle] Fetched: biz=${biz.length}, plans=${plans.length}, leads=${leads.length}`)

  if (!biz.length) {
    console.error('Lifecycle data: no biz found')
    return null
  }

  const now = new Date()

  // Build lead phone set (normalized) for marketing_source detection
  const leadPhones = new Set<string>()
  leads.forEach((l: any) => {
    if (l.phone) leadPhones.add(normalizePhone(l.phone))
  })

  // Build alias → revenue, latest expiry, and package set
  const aliasRevenue: Record<string, number> = {}
  const aliasLatestExpiry: Record<string, Date> = {}
  const aliasPackages: Record<string, Set<string>> = {}
  plans.forEach((p: any) => {
    if (!p.alias_url) return
    aliasRevenue[p.alias_url] = (aliasRevenue[p.alias_url] || 0) + (Number(p.amount_vnd) || 0)
    if (p.expiry_date) {
      const exp = new Date(p.expiry_date)
      if (!aliasLatestExpiry[p.alias_url] || exp > aliasLatestExpiry[p.alias_url]) {
        aliasLatestExpiry[p.alias_url] = exp
      }
    }
    // Track all package types purchased per alias
    const pkgName = (p.package_name || '').toUpperCase()
    if (pkgName) {
      if (!aliasPackages[p.alias_url]) aliasPackages[p.alias_url] = new Set()
      aliasPackages[p.alias_url].add(pkgName)
    }
  })

  // Addon package names (non-core: exclude PRO and FREE)
  const ADDON_PACKAGES = new Set(['GEN_AI', 'ZALO_ZNS'])

  // ══════════════ FULL FUNNEL (4 stages × 2 segments) ══════════════
  // Stage 1: Leads = Marketing + Organic
  const mktLeadsCount = biz.filter((b: any) => b.phone && leadPhones.has(normalizePhone(b.phone))).length
  const organicCount = biz.length - mktLeadsCount

  // Stage 2: Free = Free Active (still trial) + Free w/ Purchase
  const freeActiveCount = biz.filter((b: any) => {
    const plan = (b.current_plan || '').toUpperCase()
    return plan === 'FREE' && (b.status === 'Trial' || b.status === 'Sắp hết trial')
  }).length
  const freePurchaseCount = biz.filter((b: any) => {
    const plan = (b.current_plan || '').toUpperCase()
    const rev = b.alias_url ? (aliasRevenue[b.alias_url] || 0) : 0
    return plan === 'FREE' && rev > 0
  }).length

  // Stage 3: Pro Active = Pro Only + Pro + Addons
  const proActiveBiz = biz.filter((b: any) => {
    const plan = (b.current_plan || '').toUpperCase()
    if (plan !== 'PRO') return false
    const expiry = b.alias_url ? aliasLatestExpiry[b.alias_url] : null
    return expiry ? expiry >= now : false
  })
  const proOnlyCount = proActiveBiz.filter((b: any) => {
    const pkgs = b.alias_url ? aliasPackages[b.alias_url] : null
    if (!pkgs) return true // no packages info → count as pro only
    return ![...pkgs].some(p => ADDON_PACKAGES.has(p))
  }).length
  const proAddonsCount = proActiveBiz.length - proOnlyCount

  // Stage 4: Churned = Pro Expired + Free Expired
  const proExpiredCount = biz.filter((b: any) => {
    const plan = (b.current_plan || '').toUpperCase()
    if (plan !== 'PRO') return false
    const expiry = b.alias_url ? aliasLatestExpiry[b.alias_url] : null
    return !expiry || expiry < now
  }).length
  const freeExpiredCount = biz.filter((b: any) => {
    const plan = (b.current_plan || '').toUpperCase()
    return plan === 'FREE' && b.status === 'Hết trial'
  }).length

  const funnel = [
    {
      stage: 'Leads',
      total: mktLeadsCount + organicCount,
      segmentA: { label: 'Marketing Leads', value: mktLeadsCount, color: '#3b82f6' },
      segmentB: { label: 'Organic', value: organicCount, color: '#93c5fd' },
    },
    {
      stage: 'Free Users',
      total: freeActiveCount + freePurchaseCount,
      segmentA: { label: 'Free Active', value: freeActiveCount, color: '#f59e0b' },
      segmentB: { label: 'Free + Purchase', value: freePurchaseCount, color: '#fcd34d' },
    },
    {
      stage: 'Pro Active',
      total: proOnlyCount + proAddonsCount,
      segmentA: { label: 'Pro Only', value: proOnlyCount, color: '#10b981' },
      segmentB: { label: 'Pro + Addons', value: proAddonsCount, color: '#6ee7b7' },
    },
    {
      stage: 'Churned',
      total: proExpiredCount + freeExpiredCount,
      segmentA: { label: 'Pro Expired', value: proExpiredCount, color: '#f43f5e' },
      segmentB: { label: 'Free Expired', value: freeExpiredCount, color: '#fda4af' },
    },
  ]

  // Scorecards
  const trials = biz.filter((b: any) => b.status?.includes('Trial') || b.status?.includes('trial'))
  const newTrials = trials.length
  const converted = biz.filter((b: any) => b.conversion_date).length
  const expiredTrials = biz.filter((b: any) => b.status === 'Hết trial' && !b.conversion_date).length

  // Avg trial duration for converted
  const trialDurations: number[] = []
  biz.forEach((b: any) => {
    if (b.conversion_date && b.trial_expiry) {
      const convDate = new Date(b.conversion_date)
      const trialStart = new Date(new Date(b.trial_expiry).getTime() - 14 * 24 * 60 * 60 * 1000)
      const days = Math.round((convDate.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000))
      if (days > 0 && days < 365) trialDurations.push(days)
    }
  })
  const avgTrialDuration = trialDurations.length > 0
    ? Math.round(trialDurations.reduce((a, b) => a + b, 0) / trialDurations.length)
    : 0

  const trialConvRate = (converted + expiredTrials) > 0
    ? Number(((converted / (converted + expiredTrials)) * 100).toFixed(1))
    : 0

  // Expiring plans calendar (next 30 days)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringPlansMap: Record<string, number> = {}
  plans.forEach((p: any) => {
    if (!p.expiry_date) return
    const exp = new Date(p.expiry_date)
    if (exp >= now && exp <= thirtyDaysFromNow) {
      const key = exp.toISOString().split('T')[0]
      if (!expiringPlansMap[key]) expiringPlansMap[key] = 0
      expiringPlansMap[key] += 1
    }
  })
  const expiringCalendar = Object.entries(expiringPlansMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // Days remaining by alias for lifecycle table (aliasRevenue already computed above)
  const aliasDaysRemaining: Record<string, number> = {}
  plans.forEach((p: any) => {
    if (p.alias_url && p.expiry_date) {
      const remaining = Math.round((new Date(p.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      aliasDaysRemaining[p.alias_url] = Math.max(aliasDaysRemaining[p.alias_url] || 0, remaining)
    }
  })

  // Lifecycle stage table — compute risk for ALL rows, sort, then slice
  const lifecycleTable = biz
    .filter((b: any) => b.biz_name)
    .map((b: any) => {
      const daysRemaining = b.trial_expiry
        ? Math.round((new Date(b.trial_expiry).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : (b.alias_url ? (aliasDaysRemaining[b.alias_url] || 0) : 0)
      const revenue = b.alias_url ? (aliasRevenue[b.alias_url] || 0) : 0

      let risk: 'healthy' | 'at_risk' | 'critical' = 'healthy'
      if (b.status === 'Hết trial' || (b.status?.includes('Trial') && daysRemaining < 7 && daysRemaining >= 0)) {
        risk = 'critical'
      } else if (b.status === 'Sắp hết trial' || (daysRemaining >= 0 && daysRemaining < 14)) {
        risk = 'at_risk'
      }

      return {
        biz_name: b.biz_name,
        sales_rep: b.sales_rep || '—',
        current_plan: b.current_plan || '—',
        status: b.status || '—',
        days_remaining: daysRemaining,
        total_revenue: revenue,
        risk,
      }
    })
    .sort((a: any, b: any) => {
      const riskOrder: Record<string, number> = { critical: 0, at_risk: 1, healthy: 2 }
      return riskOrder[a.risk] - riskOrder[b.risk]
    })
    .slice(0, 50)

  // Days-to-convert distribution
  const daysToConvertBuckets: Record<string, number> = {
    '0-3': 0, '4-7': 0, '8-14': 0, '15-21': 0, '22-30': 0, '30+': 0,
  }
  trialDurations.forEach(d => {
    if (d <= 3) daysToConvertBuckets['0-3'] += 1
    else if (d <= 7) daysToConvertBuckets['4-7'] += 1
    else if (d <= 14) daysToConvertBuckets['8-14'] += 1
    else if (d <= 21) daysToConvertBuckets['15-21'] += 1
    else if (d <= 30) daysToConvertBuckets['22-30'] += 1
    else daysToConvertBuckets['30+'] += 1
  })
  const conversionDistribution = Object.entries(daysToConvertBuckets).map(([range, count]) => ({ range, count }))

  return {
    scorecards: {
      newTrials,
      converted,
      avgTrialDuration,
      expiredTrials,
      trialConvRate,
    },
    funnel,
    expiringCalendar,
    lifecycleTable,
    conversionDistribution,
  }
}

// ──────────────────────────── DASHBOARD SIDEBAR ────────────────────────────
export async function getDashboardSidebarStats() {
  const supabase = await createClient()

  // 1. Get segment count
  const { count: segmentCount } = await supabase.from('dynamic_segments').select('*', { count: 'exact', head: true })

  // 2. Dates for filtering
  const now = new Date()
  
  // Today start (00:00:00)
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // Start of week (Monday 00:00:00)
  const currentDay = now.getDay()
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - distanceToMonday)
  weekStart.setHours(0, 0, 0, 0)

  // 3. Parallel fetch core tables (JS filtering is faster for these counts < 5k rows)
  const [leads, biz, plans] = await Promise.all([
    fetchAllPages(async (from, to) => 
      supabase.from('marketing_leads').select('created_at').range(from, to)
    ),
    fetchAllPages(async (from, to) => 
      supabase.from('biz_plans').select('current_plan, conversion_date').range(from, to)
    ),
    fetchAllPages(async (from, to) => 
      supabase.from('purchased_plans').select('amount_vnd, is_first_purchase, purchase_date').range(from, to)
    ),
  ])

  const calculateForRange = (startDate: Date) => {
    const leadsCount = leads.filter(l => l.created_at && new Date(l.created_at) >= startDate).length
    const freeBizCount = biz.filter(b => {
      const plan = (b.current_plan || '').toUpperCase()
      return plan === 'FREE' && b.conversion_date && new Date(b.conversion_date) >= startDate
    }).length
    const newProCount = plans.filter(p => p.is_first_purchase && p.purchase_date && new Date(p.purchase_date) >= startDate).length
    const revenue = plans.filter(p => p.purchase_date && new Date(p.purchase_date) >= startDate)
                         .reduce((sum, p) => sum + (Number(p.amount_vnd) || 0), 0)
    
    return { leadsCount, freeBizCount, newProCount, revenue }
  }

  return {
    segmentCount: segmentCount || 0,
    today: calculateForRange(todayStart),
    thisWeek: calculateForRange(weekStart)
  }
}
