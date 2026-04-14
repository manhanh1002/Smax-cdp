'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Eye, Flame, Activity, Zap,
} from 'lucide-react'
import { formatVNDShort } from '@/lib/format-utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts'

interface ProductAdoptionTabProps {
  data: {
    scorecards: {
      totalSessions30d: number
      mostUsedModule: string
      totalEvents30d: number
      bounceRateAvg: number
    }
    moduleRanking: { name: string; fullName: string; users: number; events: number }[]
    usageTrend: Record<string, unknown>[]
    topModules: string[]
    engagementScatter: { name: string; fullName: string; sessions: number; eventsPerSession: number; totalEvents: number }[]
  }
}

const CARD_STYLE = 'bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl'
const MODULE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e']

export function ProductAdoptionTab({ data }: ProductAdoptionTabProps) {
  const { scorecards, moduleRanking, usageTrend, topModules, engagementScatter } = data

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scorecards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <ScoreCard icon={<Eye className="size-5" />} iconBg="bg-blue-50 text-blue-600" label="Tổng Phiên (30 ngày)" value={scorecards.totalSessions30d.toLocaleString()} />
        <ScoreCard icon={<Flame className="size-5" />} iconBg="bg-amber-50 text-amber-600" label="Tính năng dùng nhiều nhất" value={scorecards.mostUsedModule.length > 20 ? scorecards.mostUsedModule.substring(0, 17) + '...' : scorecards.mostUsedModule} />
        <ScoreCard icon={<Activity className="size-5" />} iconBg="bg-emerald-50 text-emerald-600" label="Tổng Sự kiện (30 ngày)" value={scorecards.totalEvents30d.toLocaleString()} />
        <ScoreCard icon={<Zap className="size-5" />} iconBg="bg-indigo-50 text-indigo-600" label="Sự kiện / Phiên" value={`${scorecards.bounceRateAvg}`} />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Module Usage Ranking — Horizontal Bar Top 10 */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Flame className="size-4 text-amber-500" />
              Xếp hạng Sử dụng Tính năng (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleRanking} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#52525b' }} tickLine={false} axisLine={false} width={150} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-zinc-900 text-white text-xs rounded-xl py-2 px-3 shadow-lg">
                          <p className="font-semibold">{d.fullName}</p>
                          <p>Người dùng: {d.users.toLocaleString()}</p>
                          <p>Sự kiện: {d.events.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="users" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} name="Người dùng Active" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Usage Trend by Module — multi-line */}
        <Card className={CARD_STYLE}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Activity className="size-4 text-blue-500" />
              Xu hướng Sử dụng theo Tính năng (30 ngày)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e4e4e7' }}
                    interval={Math.max(0, Math.floor(usageTrend.length / 8))}
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={45} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    labelFormatter={(v) => v}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  {topModules.map((mod, i) => (
                    <Line
                      key={mod}
                      type="monotone"
                      dataKey={mod}
                      stroke={MODULE_COLORS[i % MODULE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={mod.length > 25 ? mod.substring(0, 22) + '...' : mod}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Engagement Scatter ── */}
      <Card className={CARD_STYLE}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Zap className="size-4 text-indigo-500" />
            Ma trận Tương tác — Phiên vs Độ sâu
          </CardTitle>
          <p className="text-[11px] text-zinc-400 mt-1">X: Số phiên · Y: Sự kiện/Phiên · Bong bóng: Tổng sự kiện</p>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis
                  dataKey="sessions"
                  type="number"
                  name="Số phiên"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickFormatter={(v) => formatVNDShort(v)}
                  label={{ value: 'Số phiên', position: 'bottom', fontSize: 11, fill: '#a1a1aa' }}
                />
                <YAxis
                  dataKey="eventsPerSession"
                  type="number"
                  name="Sự kiện/Phiên"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Sự kiện / Phiên', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#a1a1aa' }}
                />
                <ZAxis dataKey="totalEvents" range={[60, 600]} name="Tổng sự kiện" />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-zinc-900 text-white text-xs rounded-xl py-2 px-3 shadow-lg">
                        <p className="font-semibold">{d.fullName}</p>
                        <p>Số phiên: {d.sessions.toLocaleString()}</p>
                        <p>Sự kiện/Phiên: {d.eventsPerSession}</p>
                        <p>Tổng sự kiện: {d.totalEvents.toLocaleString()}</p>
                      </div>
                    )
                  }}
                />
                <Scatter data={engagementScatter} shape="circle">
                  {engagementScatter.map((_, i) => (
                    <Cell key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} opacity={0.7} />
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
