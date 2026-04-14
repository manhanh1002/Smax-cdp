import { createClient } from '@/lib/supabase/server'
import CustomerTable from '@/components/customers/CustomerTable'

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

  // Fetch all segments for the dropdown
  const { data: segments } = await supabase.from('dynamic_segments').select('*')

  // Calculate range for pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 1. Reusable filter applier helper
  const applyFilters = (qb: any) => {
    // Text Search
    if (search) {
      qb = qb.or(`biz_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Direct Filters (Only if no segment is selected)
    if (!segmentId) {
      if (plan) qb = qb.eq('current_plan', plan)
      if (trial) qb = qb.eq('biz_status', trial)
      if (ga4 === 'yes') qb = qb.gt('total_visitors_all_time', 0)
      else if (ga4 === 'no') qb = qb.eq('total_visitors_all_time', 0)
      if (pkg) qb = qb.filter('transactions', 'cs', JSON.stringify([{ package_name: pkg }]))
    } else if (segments) {
      const activeSegment = segments.find(s => s.id === segmentId)
      if (activeSegment?.rules) {
        activeSegment.rules.forEach((rule: any) => {
          const { field, operator, value } = rule
          
          if (operator === 'is_any') {
            if (field === 'module_used') qb = qb.neq('module_usage', '[]')
            else qb = qb.not(field, 'is', null)
          } else if (operator === 'is_empty') {
            if (field === 'module_used') qb = qb.eq('module_usage', '[]')
            else qb = qb.is(field, null)
          } else if (field === 'module_used') {
            const moduleTitles = Array.isArray(value) ? value : [value]
            moduleTitles.forEach(title => {
              qb = qb.filter('module_usage', 'cs', JSON.stringify([{ title }]))
            })
          } else if (field.includes('date')) {
            const days = parseInt(value) || 30
            const now = new Date()
            
            if (field.includes('expiry')) {
              // FUTURE-oriented logic (Targeting upcoming/past expiries)
              if (operator === 'within_last') {
                // Within next X days: Today <= expiry <= Today + X
                const futureDate = new Date()
                futureDate.setDate(now.getDate() + days)
                qb = qb.gte(field, now.toISOString()).lte(field, futureDate.toISOString())
              } else if (operator === 'older_than') {
                // Already expired: expiry < Today
                qb = qb.lt(field, now.toISOString())
              }
            } else {
              // PAST-oriented logic (Targeting historical events like conversion_date)
              const pastDate = new Date()
              pastDate.setDate(now.getDate() - days)
              const iso = pastDate.toISOString()
              if (operator === 'within_last') qb = qb.gte(field, iso)
              else if (operator === 'older_than') qb = qb.lt(field, iso)
            }
          } else if (operator === 'in') {
            qb = qb.in(field, Array.isArray(value) ? value : [value])
          } else {
            switch (operator) {
              case '==': qb = qb.eq(field, value); break;
              case '!=': qb = qb.neq(field, value); break;
              case '>=': qb = qb.gte(field, value); break;
              case '<=': qb = qb.lte(field, value); break;
              case '>': qb = qb.gt(field, value); break;
              case '<': qb = qb.lt(field, value); break;
              case 'contains': qb = qb.ilike(field, `%${value}%`); break;
            }
          }
        })
      }
    }
    return qb
  }

  // Execute Main Paginated Query
  let mainQuery = supabase.from('customer_profiles').select('*', { count: 'exact' })
  mainQuery = applyFilters(mainQuery)
  
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

  // 2. Fetch Stats (Aggregates) - Optimized for Cloud Performance
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
    
    // Fetch sequentially to prevent DB timeouts on heavy views
    for (let sFrom = 0; sFrom < maxToFetch; sFrom += sPageSize) {
      let q = supabase
        .from('customer_profiles')
        .select('total_revenue_vnd, current_plan, transactions')
      q = applyFilters(q)
      
      const { data, error } = await q.range(sFrom, sFrom + sPageSize - 1)
      if (error) {
        console.error(`STATS_BATCH_ERROR at offset ${sFrom}:`, error.message || JSON.stringify(error))
        break // Stop fetching further if one batch fails
      }
      if (data) {
        statsData = statsData.concat(data)
        // If we fetched fewer than requested, we've reached the end
        if (data.length < sPageSize) {
          break
        }
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
        segments={segments || []}
        stats={stats}
      />
    </div>
  )
}
