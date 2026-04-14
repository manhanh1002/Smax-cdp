import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Users, Activity, ShoppingCart, Target } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch metrics from synced tables
  const { data: ga4Data } = await supabase.from('ga4_metrics').select('*').order('date', { ascending: false }).limit(7)
  const { data: recentPurchases } = await supabase.from('purchased_plans').select('*').order('purchase_date', { ascending: false }).limit(4)
  const { data: leads } = await supabase.from('marketing_leads').select('*').order('created_at', { ascending: false }).limit(4)
  
  // Aggregate stats (fallback to 0 if no data)
  const totalRevenue = recentPurchases?.reduce((acc, p) => acc + Number(p.amount), 0) || 0
  const activeUsers = ga4Data?.[0]?.active_users || 0
  const conversionRate = ga4Data?.[0]?.engagement_rate ? (ga4Data[0].engagement_rate * 100).toFixed(1) : 0
  const totalLeads = leads?.length || 0

  const stats = [
    {
      title: 'Current Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+12% from last sync',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'GA4 Active Users',
      value: activeUsers.toLocaleString(),
      change: 'Real-time from Google',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Engagement Rate',
      value: `${conversionRate}%`,
      change: 'Avg. across all pages',
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Marketing Leads',
      value: totalLeads.toString(),
      change: 'Latest from Sheets',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 font-sans">Smax Analytics Intelligence</h1>
        <p className="text-zinc-500 font-medium tracking-tight">Consolidated view of Google Sheets and GA4 internal data.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-zinc-900 tracking-tight">{stat.value}</div>
              <p className={`text-xs mt-2 font-semibold ${stat.color}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Purchases (from Google Sheets) */}
        <Card className="col-span-4 border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900">Recent Transactions</CardTitle>
            <CardDescription className="text-zinc-500 font-medium">
              Directly synced from "Database gói cước vừa mua".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentPurchases?.length ? recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center gap-4 border-b border-zinc-100 pb-6 last:border-0 last:pb-0">
                  <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <ShoppingCart className="size-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-bold text-zinc-900">{purchase.package_name}</p>
                    <p className="text-xs text-zinc-500 font-medium">{purchase.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-zinc-900">${Number(purchase.amount).toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(purchase.purchase_date).toLocaleDateString()}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-zinc-400 font-medium">No purchase data synced yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Marketing Leads (from Google Sheets) */}
        <Card className="col-span-3 border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900">Incoming Leads</CardTitle>
            <CardDescription className="text-zinc-500 font-medium">
              Synced from "Leads marketing".
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-6">
               {leads?.length ? leads.map((lead) => (
                 <div key={lead.id} className="flex items-center gap-4">
                    <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-bold text-[10px]">
                      {lead.lead_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900 leading-none">{lead.lead_name}</p>
                      <p className="text-xs text-zinc-400 mt-1">{lead.source}</p>
                    </div>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {lead.campaign}
                    </div>
                 </div>
               )) : (
                 <div className="text-center py-10 text-zinc-400 font-medium">No leads synced yet.</div>
               )}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* GA4 Health Chart Placeholder */}
      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-900">GA4 Traffic Trends</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Daily active users and sessions over the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-end justify-between gap-2 px-10">
          {ga4Data?.length ? [...ga4Data].reverse().map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
              <div 
                className="w-full bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600" 
                style={{ height: `${(day.active_users / (Math.max(...ga4Data.map(d => d.active_users)) || 1)) * 150}px` }}
              ></div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
            </div>
          )) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium border-2 border-dashed border-zinc-100 rounded-xl">
              Charts will appear once GA4 data is synced.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
