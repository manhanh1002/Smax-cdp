'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign, Users, Clock, TrendingUp, RefreshCw,
  BarChart3, Trophy
} from 'lucide-react'
import { formatVND, formatVNDShort } from '@/lib/format-utils'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend,
} from 'recharts'

interface OverviewTabProps {
  data: {
    scorecards: {
      mrr: number
      activeCustomers: number
      trialExpiring: number
      conversionRate: number
      newThisMonth: number
      expansionThisMonth: number
    }
    revenueTrend: { month: string; newRev: number; expRev: number }[]
    statusBreakdown: { name: string; value: number; color: string }[]
    topSalesReps: { name: string; revenue: number }[]
  }
}

const CARD_STYLE = 'bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl'

export function OverviewTab({ data }: OverviewTabProps) {
  const { scorecards, revenueTrend, statusBreakdown, topSalesReps } = data
  const totalDonut = statusBreakdown.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scorecards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <ScorecardItem
          icon={<DollarSign className="size-5" />}
          iconBg="bg-blue-50 text-blue-600"
          label="MRR hiện tại"
          value={formatVNDShort(scorecards.mrr)}
          sub="Plans còn hạn"
        />
        <ScorecardItem
          icon={<Users className="size-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
          label="Khách Active"
          value={scorecards.activeCustomers.toLocaleString()}
          sub={`${scorecards.conversionRate}% conversion`}
        />
        <ScorecardItem
          icon={<Clock className="size-5" />}
          iconBg={scorecards.trialExpiring > 5 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}
          label="Trial sắp hết"
          value={scorecards.trialExpiring.toString()}
          sub="trong 7 ngày tới"
          badge={scorecards.trialExpiring > 5 ? 'urgent' : undefined}
        />
        <ScorecardItem
          icon={<TrendingUp className="size-5" />}
          iconBg="bg-indigo-50 text-indigo-600"
          label="Conversion Rate"
          value={`${scorecards.conversionRate}%`}
          sub="Active / (Active + Trial)"
        />
        <ScorecardItem
          icon={<RefreshCw className="size-5" />}
          iconBg="bg-cyan-50 text-cyan-600"
          label="New vs Expansion"
          value={`${scorecards.newThisMonth} / ${scorecards.expansionThisMonth}`}
          sub="Tháng này"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend — 2 cols */}
        <Card className={`${CARD_STYLE} lg:col-span-2`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600" />
              Revenue Trend (12 tháng)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e4e4e7' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                    tickFormatter={(v) => formatVNDShort(v)}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatVND(value),
                      name === 'newRev' ? 'New Revenue' : 'Expansion Revenue',
                    ]}
                    contentStyle={{
                      background: '#18181b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  />
                  <Legend
                    formatter={(value) => (value === 'newRev' ? 'New Revenue' : 'Expansion Revenue')}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="newRev" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="expRev" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Status Donut — 1 col */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Users className="size-4 text-indigo-500" />
              Customer Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} (${((value / totalDonut) * 100).toFixed(1)}%)`, '']}
                    contentStyle={{
                      background: '#18181b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {statusBreakdown.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}: <span className="font-semibold text-zinc-800">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Sales Reps ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Top 5 Sales Reps (Tổng Doanh thu)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSalesReps} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickFormatter={(v) => formatVNDShort(v)}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#52525b' }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [formatVND(value), 'Revenue']}
                  contentStyle={{
                    background: '#18181b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Scorecard Item Component ──
function ScorecardItem({
  icon,
  iconBg,
  label,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub?: string
  badge?: 'urgent'
}) {
  return (
    <Card className={`${CARD_STYLE} relative overflow-hidden`}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className={`${iconBg} p-2 rounded-xl`}>{icon}</div>
          {badge === 'urgent' && (
            <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              URGENT
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-zinc-900 mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
