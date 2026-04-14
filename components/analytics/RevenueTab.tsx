'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign, TrendingUp, RefreshCw, Package, AlertTriangle, Award,
} from 'lucide-react'
import { formatVND, formatVNDShort } from '@/lib/format-utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend,
} from 'recharts'

interface RevenueTabProps {
  data: {
    scorecards: {
      totalRevenue: number
      newRevenue: number
      expansionRevenue: number
      avgDealSize: number
      topPackage: string
      expiringRevenue: number
    }
    allPackages: string[]
    packageMix: Record<string, unknown>[]
    revenueWaterfall: { month: string; newRev: number; expRev: number }[]
    topCustomers: { biz_name: string; total: number; count: number; plan: string }[]
    revenueHeatmap: { date: string; revenue: number }[]
  }
}

const CARD_STYLE = 'bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl'
const PACKAGE_COLORS: Record<string, string> = {
  PRO: '#3b82f6',
  ZALO_ZNS: '#8b5cf6',
  GEN_AI: '#10b981',
  FREE: '#a1a1aa',
  KHÁC: '#f59e0b',
  '': '#d4d4d8',
}

export function RevenueTab({ data }: RevenueTabProps) {
  const { scorecards, allPackages, packageMix, revenueWaterfall, topCustomers, revenueHeatmap } = data
  const maxHeatmapRev = Math.max(...revenueHeatmap.map(h => h.revenue), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scorecards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ScoreCard icon={<DollarSign className="size-5" />} iconBg="bg-blue-50 text-blue-600" label="Total Revenue" value={formatVNDShort(scorecards.totalRevenue)} />
        <ScoreCard icon={<TrendingUp className="size-5" />} iconBg="bg-emerald-50 text-emerald-600" label="New Revenue" value={formatVNDShort(scorecards.newRevenue)} />
        <ScoreCard icon={<RefreshCw className="size-5" />} iconBg="bg-cyan-50 text-cyan-600" label="Expansion Revenue" value={formatVNDShort(scorecards.expansionRevenue)} />
        <ScoreCard icon={<Package className="size-5" />} iconBg="bg-indigo-50 text-indigo-600" label="Avg Deal Size" value={formatVNDShort(scorecards.avgDealSize)} />
        <ScoreCard icon={<Award className="size-5" />} iconBg="bg-amber-50 text-amber-600" label="Top Package" value={scorecards.topPackage} />
        <ScoreCard icon={<AlertTriangle className="size-5" />} iconBg="bg-rose-50 text-rose-600" label="Expiring Revenue (30d)" value={formatVNDShort(scorecards.expiringRevenue)} />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Waterfall */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" />
              Revenue Waterfall — New vs Expansion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueWaterfall} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => formatVNDShort(v)} tickLine={false} axisLine={false} width={55} />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatVND(value), name === 'newRev' ? 'New' : 'Expansion']}
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend formatter={(v) => (v === 'newRev' ? 'New Revenue' : 'Expansion')} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="newRev" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="expRev" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Package Revenue Mix */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Package className="size-4 text-indigo-500" />
              Package Revenue Mix (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageMix} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => formatVNDShort(v)} tickLine={false} axisLine={false} width={55} />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatVND(value), name]}
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {allPackages.map((pkg) => (
                    <Bar key={pkg} dataKey={pkg} stackId="a" fill={PACKAGE_COLORS[pkg] || '#a1a1aa'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue Heatmap (90 days) ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <DollarSign className="size-4 text-emerald-500" />
            Revenue Heatmap — 90 ngày gần nhất
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="flex flex-wrap gap-1">
            {revenueHeatmap.map((d, i) => {
              const intensity = d.revenue / maxHeatmapRev
              const alpha = Math.max(0.08, intensity)
              return (
                <div
                  key={i}
                  className="w-4 h-4 rounded-[3px] cursor-pointer group relative"
                  style={{ background: `rgba(16, 185, 129, ${alpha})` }}
                  title={`${d.date}: ${formatVND(d.revenue)}`}
                >
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] rounded py-1 px-2 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none">
                    {d.date}: {formatVNDShort(d.revenue)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400">
            <span>Ít</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((a, i) => (
                <div key={i} className="w-3 h-3 rounded-[2px]" style={{ background: `rgba(16, 185, 129, ${a})` }} />
              ))}
            </div>
            <span>Nhiều</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Top 20 Customers LTV ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Award className="size-4 text-amber-500" />
            Top 20 Customers by LTV
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">#</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Business</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Total Revenue</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Transactions</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">LTV Bar</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => {
                const maxRev = topCustomers[0]?.total || 1
                const barPct = (c.total / maxRev) * 100
                return (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2 px-3 text-zinc-400 font-medium">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-zinc-800">{c.biz_name}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600">{formatVNDShort(c.total)}</td>
                    <td className="py-2 px-3 text-right text-zinc-500">{c.count}</td>
                    <td className="py-2 px-3 w-[120px]">
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreCard({
  icon, iconBg, label, value,
}: {
  icon: React.ReactNode; iconBg: string; label: string; value: string
}) {
  return (
    <Card className={`${CARD_STYLE} relative overflow-hidden`}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className={`${iconBg} p-2 rounded-xl w-fit`}>{icon}</div>
        <div>
          <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
