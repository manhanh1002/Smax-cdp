'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, Zap, Clock, Skull, Target,
  CalendarDays, ArrowDown,
} from 'lucide-react'
import { formatVND, formatVNDShort } from '@/lib/format-utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

interface FunnelStage {
  stage: string
  total: number
  segmentA: { label: string; value: number; color: string }
  segmentB: { label: string; value: number; color: string }
}

interface LifecycleTabProps {
  data: {
    scorecards: {
      newTrials: number
      converted: number
      avgTrialDuration: number
      expiredTrials: number
      trialConvRate: number
    }
    funnel: FunnelStage[]
    expiringCalendar: { date: string; count: number }[]
    lifecycleTable: {
      biz_name: string
      sales_rep: string
      current_plan: string
      status: string
      days_remaining: number
      total_revenue: number
      risk: 'healthy' | 'at_risk' | 'critical'
    }[]
    conversionDistribution: { range: string; count: number }[]
  }
}

const CARD_STYLE = 'bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl'

const RISK_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  healthy: { label: '🟢 Healthy', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  at_risk: { label: '🟡 At Risk', bg: 'bg-amber-50', text: 'text-amber-700' },
  critical: { label: '🔴 Critical', bg: 'bg-rose-50', text: 'text-rose-700' },
}

export function LifecycleTab({ data }: LifecycleTabProps) {
  const { scorecards, funnel, expiringCalendar, lifecycleTable, conversionDistribution } = data
  const maxExpiring = Math.max(...expiringCalendar.map(e => e.count), 1)
  const maxFunnelTotal = funnel[0]?.total || 1

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scorecards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <ScoreCard icon={<Users className="size-5" />} iconBg="bg-blue-50 text-blue-600" label="New Trials" value={scorecards.newTrials.toLocaleString()} />
        <ScoreCard icon={<Zap className="size-5" />} iconBg="bg-emerald-50 text-emerald-600" label="Converted" value={scorecards.converted.toLocaleString()} />
        <ScoreCard icon={<Clock className="size-5" />} iconBg="bg-indigo-50 text-indigo-600" label="Avg Trial Duration" value={`${scorecards.avgTrialDuration}d`} />
        <ScoreCard icon={<Skull className="size-5" />} iconBg="bg-rose-50 text-rose-600" label="Trials Expired" value={scorecards.expiredTrials.toLocaleString()} />
        <ScoreCard icon={<Target className="size-5" />} iconBg="bg-amber-50 text-amber-600" label="Trial Conv Rate" value={`${scorecards.trialConvRate}%`} />
      </div>

      {/* ── Full Funnel + Days-to-Convert ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Full Lifecycle Funnel — takes 3 cols */}
        <Card className={`${CARD_STYLE} lg:col-span-3`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Target className="size-4 text-emerald-500" />
              Full Lifecycle Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-5 px-5">
            <div className="flex flex-col gap-1">
              {funnel.map((stage, i) => {
                const pctOfMax = (stage.total / maxFunnelTotal) * 100
                const pctA = stage.total > 0 ? (stage.segmentA.value / stage.total) * 100 : 0
                const pctB = stage.total > 0 ? (stage.segmentB.value / stage.total) * 100 : 0
                const dropOff = i > 0 
                  ? (((funnel[i - 1].total - stage.total) / funnel[i - 1].total) * 100).toFixed(1) 
                  : null

                return (
                  <React.Fragment key={stage.stage}>
                    {/* Drop-off arrow between stages */}
                    {i > 0 && (
                      <div className="flex items-center justify-center gap-2 py-0.5">
                        <ArrowDown className="size-3.5 text-zinc-300" />
                        <span className="text-[10px] font-bold text-rose-400">
                          -{dropOff}%
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      {/* Stage header */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-[13px] font-semibold text-zinc-800">{stage.stage}</span>
                        <span className="text-[13px] font-bold text-zinc-900 tabular-nums">
                          {stage.total.toLocaleString()}
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="relative w-full bg-zinc-50 rounded-lg h-9 overflow-hidden border border-zinc-100">
                        <div className="flex h-full" style={{ width: `${Math.max(pctOfMax, 4)}%` }}>
                          {/* Segment A */}
                          {stage.segmentA.value > 0 && (
                            <div
                              className="h-full flex items-center justify-center transition-all duration-700 ease-out"
                              style={{
                                width: `${pctA}%`,
                                backgroundColor: stage.segmentA.color,
                                borderRadius: stage.segmentB.value > 0 ? '8px 0 0 8px' : '8px',
                              }}
                            >
                              {pctA > 15 && (
                                <span className="text-[10px] font-bold text-white/90 px-1 truncate">
                                  {stage.segmentA.value.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Segment B */}
                          {stage.segmentB.value > 0 && (
                            <div
                              className="h-full flex items-center justify-center transition-all duration-700 ease-out"
                              style={{
                                width: `${pctB}%`,
                                backgroundColor: stage.segmentB.color,
                                borderRadius: stage.segmentA.value > 0 ? '0 8px 8px 0' : '8px',
                              }}
                            >
                              {pctB > 15 && (
                                <span className="text-[10px] font-bold text-white/90 px-1 truncate">
                                  {stage.segmentB.value.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Legend row — 2 segments side by side */}
                      <div className="flex items-center justify-between text-[10px] pb-1">
                        {stage.segmentA.value > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: stage.segmentA.color }} />
                            <span className="text-zinc-500 font-medium">{stage.segmentA.label}</span>
                            <span className="font-bold text-zinc-700">{stage.segmentA.value.toLocaleString()}</span>
                          </div>
                        ) : <div />}
                        {stage.segmentB.value > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-700">{stage.segmentB.value.toLocaleString()}</span>
                            <span className="text-zinc-500 font-medium">{stage.segmentB.label}</span>
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: stage.segmentB.color }} />
                          </div>
                        ) : <div />}
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Days-to-Convert Distribution — takes 2 cols */}
        <Card className={`${CARD_STYLE} lg:col-span-2`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Clock className="size-4 text-indigo-500" />
              Days-to-Convert Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Customers']}
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    labelFormatter={(v) => `${v} days`}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Expiring Plan Calendar ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <CalendarDays className="size-4 text-rose-500" />
            Expiring Plan Calendar (30 ngày tới)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {expiringCalendar.map((d, i) => {
              const intensity = d.count / maxExpiring
              const isHigh = intensity > 0.6
              return (
                <div
                  key={i}
                  className={`relative group px-2 py-1.5 rounded-lg border text-center min-w-[48px] cursor-pointer transition-all hover:scale-105 ${
                    isHigh
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-zinc-50 border-zinc-100'
                  }`}
                >
                  <p className="text-[9px] text-zinc-400">{new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</p>
                  <p className={`text-sm font-bold ${isHigh ? 'text-rose-600' : 'text-zinc-700'}`}>{d.count}</p>
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] rounded py-1 px-2 -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none">
                    {d.date}: {d.count} plans
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Lifecycle Stage Table ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Users className="size-4 text-blue-500" />
            Lifecycle Stage Table
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Business</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Sales Rep</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Plan</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Status</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Days Left</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Revenue</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-zinc-500">Risk</th>
              </tr>
            </thead>
            <tbody>
              {lifecycleTable.slice(0, 30).map((row, i) => {
                const riskStyle = RISK_BADGE[row.risk]
                return (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-zinc-800 max-w-[180px] truncate">{row.biz_name}</td>
                    <td className="py-2 px-3 text-zinc-500">{row.sales_rep}</td>
                    <td className="py-2 px-3">
                      <span className="bg-zinc-100 text-zinc-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {row.current_plan}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-zinc-600 text-xs">{row.status}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${row.days_remaining < 7 ? 'text-rose-600' : row.days_remaining < 14 ? 'text-amber-600' : 'text-zinc-600'}`}>
                      {row.days_remaining}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600">{row.total_revenue > 0 ? formatVNDShort(row.total_revenue) : '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`${riskStyle.bg} ${riskStyle.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                        {riskStyle.label}
                      </span>
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
