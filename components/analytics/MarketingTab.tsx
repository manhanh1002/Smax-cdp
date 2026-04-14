'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail, CheckCircle, BarChart3, DollarSign, Award,
} from 'lucide-react'
import { formatVND, formatVNDShort } from '@/lib/format-utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts'

interface MarketingTabProps {
  data: {
    scorecards: {
      totalLeads: number
      convertedLeads: number
      leadConvRate: number
      revenuePerLead: number
      bestChannel: string
    }
    sourcePerformance: { name: string; fullName: string; leads: number; converted: number; rate: number }[]
    campaignPerformance: { name: string; fullName: string; leads: number; convRate: number; revenue: number }[]
    leadsByWeek: Record<string, unknown>[]
    topSources: string[]
  }
}

const CARD_STYLE = 'bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl'
const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#ec4899', '#84cc16']

export function MarketingTab({ data }: MarketingTabProps) {
  const { scorecards, sourcePerformance, campaignPerformance } = data

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scorecards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <ScoreCard icon={<Mail className="size-5" />} iconBg="bg-blue-50 text-blue-600" label="Total Leads" value={scorecards.totalLeads.toLocaleString()} />
        <ScoreCard icon={<CheckCircle className="size-5" />} iconBg="bg-emerald-50 text-emerald-600" label="Converted Leads" value={scorecards.convertedLeads.toLocaleString()} />
        <ScoreCard icon={<BarChart3 className="size-5" />} iconBg="bg-indigo-50 text-indigo-600" label="Lead → Customer" value={`${scorecards.leadConvRate}%`} />
        <ScoreCard icon={<DollarSign className="size-5" />} iconBg="bg-cyan-50 text-cyan-600" label="Revenue / Lead" value={formatVNDShort(scorecards.revenuePerLead)} />
        <ScoreCard icon={<Award className="size-5" />} iconBg="bg-amber-50 text-amber-600" label="Best Channel" value={scorecards.bestChannel.length > 18 ? scorecards.bestChannel.substring(0, 15) + '...' : scorecards.bestChannel} />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Source Performance — Horizontal Bar */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600" />
              Lead Volume by Source (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourcePerformance} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name === 'leads' ? 'Total Leads' : 'Converted']}
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} name="leads" />
                  <Bar dataKey="converted" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} name="converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel Table */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              Lead Funnel by Source
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Source</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Leads</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Converted</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Conv %</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Funnel</th>
                </tr>
              </thead>
              <tbody>
                {sourcePerformance.map((s, i) => (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-zinc-800 max-w-[180px] truncate" title={s.fullName}>{s.name}</td>
                    <td className="py-2 px-3 text-right text-zinc-600">{s.leads}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600">{s.converted}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-semibold ${s.rate >= 5 ? 'text-emerald-600' : s.rate >= 1 ? 'text-amber-600' : 'text-rose-500'}`}>
                        {s.rate}%
                      </span>
                    </td>
                    <td className="py-2 px-3 w-[100px]">
                      <div className="w-full bg-zinc-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(s.rate * 5, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ── Campaign Performance Scatter ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <BarChart3 className="size-4 text-indigo-500" />
            Campaign Performance Matrix
          </CardTitle>
          <p className="text-[11px] text-zinc-400 mt-1">X: Volume leads · Y: Conversion Rate · Bubble: Revenue</p>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis
                  dataKey="leads"
                  type="number"
                  name="Leads"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                  label={{ value: 'Volume Leads', position: 'bottom', fontSize: 11, fill: '#a1a1aa' }}
                />
                <YAxis
                  dataKey="convRate"
                  type="number"
                  name="Conv Rate"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Conversion %', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#a1a1aa' }}
                />
                <ZAxis dataKey="revenue" range={[50, 800]} name="Revenue" />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-zinc-900 text-white text-xs rounded-xl py-2 px-3 shadow-lg">
                        <p className="font-semibold">{d.fullName || d.name}</p>
                        <p>Leads: {d.leads}</p>
                        <p>Conv: {d.convRate}%</p>
                        <p>Revenue: {formatVNDShort(d.revenue)}</p>
                      </div>
                    )
                  }}
                />
                <Scatter data={campaignPerformance} shape="circle">
                  {campaignPerformance.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
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
