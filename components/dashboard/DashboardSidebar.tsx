'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus, Target, DollarSign, Layers } from 'lucide-react'
import { formatVNDShort } from '@/lib/format-utils'

interface SidebarStats {
  leadsCount: number
  freeBizCount: number
  newProCount: number
  revenue: number
}

interface DashboardSidebarProps {
  data: {
    segmentCount: number
    today: SidebarStats
    thisWeek: SidebarStats
  }
}

export function DashboardSidebar({ data }: DashboardSidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Segment Count Card ── */}
      <Card className="border-zinc-200 bg-white shadow-sm overflow-hidden group hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Phân khúc khách hàng
          </CardTitle>
          <div className="p-1.5 bg-indigo-50 border border-indigo-100/50 rounded-lg text-indigo-600">
            <Layers className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">{data.segmentCount}</span>
            <span className="text-sm font-semibold text-zinc-500 font-sans">Segments</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mt-1 italic leading-relaxed">
            Các tập điều kiện lọc tự động lưu từ Segment Builder.
          </p>
        </CardContent>
      </Card>

      {/* ── Today/Week Tabs ── */}
      <Card className="border-zinc-200 bg-white shadow-sm overflow-hidden flex-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold text-zinc-900 font-sans tracking-tight">Thống kê vận hành</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="today" className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-100/80 p-1 rounded-xl">
                <TabsTrigger 
                  value="today" 
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
                >
                  Hôm nay
                </TabsTrigger>
                <TabsTrigger 
                  value="thisWeek"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
                >
                  Tuần này
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="today" className="mt-4 animate-in fade-in duration-300">
              <StatsList stats={data.today} />
            </TabsContent>
            
            <TabsContent value="thisWeek" className="mt-4 animate-in fade-in duration-300">
              <StatsList stats={data.thisWeek} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Legend/Hint ── */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4">
        <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Nguồn dữ liệu
        </h4>
        <p className="text-[10px] text-emerald-700/70 font-medium leading-relaxed">
          Số liệu được tổng hợp thời gian thực từ Google Sheets (Marketing & Sales) và hệ thống Database thanh toán.
        </p>
      </div>
    </div>
  )
}

function StatsList({ stats }: { stats: SidebarStats }) {
  const items = [
    { label: 'Lead mới', value: stats.leadsCount, icon: Target, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Biz Free', value: stats.freeBizCount, icon: UserPlus, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Biz Pro mới', value: stats.newProCount, icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Doanh thu', value: formatVNDShort(stats.revenue), icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  ]

  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div 
          key={item.label} 
          className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/50 ${i !== items.length - 1 ? 'border-b border-zinc-50' : ''}`}
        >
          <div className={`p-2 rounded-xl ${item.bgColor} border ${item.bgColor.replace('bg-', 'border-').replace('50', '100')}`}>
            <item.icon className={`size-4 ${item.color}`} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">{item.label}</p>
            <p className="text-lg font-black text-zinc-900 tracking-tight">{item.value}</p>
          </div>
        </div>
      ))}
      <div className="px-6 py-6 bg-zinc-50/30">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <span>Tỷ lệ Pro mới / Tổng Biz</span>
          <span className="text-zinc-900 font-bold">
            {stats.freeBizCount + stats.newProCount > 0 
              ? ((stats.newProCount / (stats.freeBizCount + stats.newProCount)) * 100).toFixed(1) 
              : 0}%
          </span>
        </div>
        <div className="w-full h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
            style={{ width: `${Math.min(100, (stats.newProCount / (stats.freeBizCount + stats.newProCount || 1)) * 100)}%` }} 
          />
        </div>
      </div>
    </div>
  )
}
