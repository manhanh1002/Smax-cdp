'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart as BarChartIcon, Layers } from 'lucide-react'

interface AnalyticsChartsProps {
  dailyTrends: { date: string; revenue: number }[]
  packageStructure: { name: string; revenue: number }[]
}

export function AnalyticsCharts({ dailyTrends, packageStructure }: AnalyticsChartsProps) {
  // Helpers for Tailwind CSS Bar Chart
  const formatVNDShort = (value: number) => {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + 'M'
    return value.toLocaleString('vi-VN')
  }

  const maxDailyRevenue = Math.max(...dailyTrends.map(d => d.revenue), 1)
  const maxPackageRevenue = Math.max(...packageStructure.map(d => d.revenue), 1)

  // Y-axis ticks for Daily Trend (0 to max)
  const yAxisTicksDaily = [maxDailyRevenue, maxDailyRevenue * 0.75, maxDailyRevenue * 0.5, maxDailyRevenue * 0.25, 0]
  // Y-axis ticks for Package (0 to max)
  const yAxisTicksPackage = [maxPackageRevenue, maxPackageRevenue * 0.75, maxPackageRevenue * 0.5, maxPackageRevenue * 0.25, 0]

  return (
    <div className="grid gap-4 md:grid-cols-3 mt-4">
      {/* Daily Trends Chart - takes 2 columns */}
      <Card className="md:col-span-2 bg-white flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-800">
            <BarChartIcon className="size-5 text-blue-600" />
            Xu hướng doanh thu theo ngày
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-6 pt-4 px-6 flex flex-col relative">
          <div className="flex-1 flex gap-2 w-full h-[300px]">
             {/* Y-Axis */}
             <div className="flex flex-col justify-between items-end pr-2 text-xs text-zinc-500 min-w-[40px] pb-6">
                {yAxisTicksDaily.map((tick, i) => (
                  <span key={i}>{formatVNDShort(tick)}</span>
                ))}
             </div>
             
             {/* Chart Area */}
             <div className="relative flex-1 flex items-end gap-[1px] sm:gap-1  border-b border-zinc-200 pb-0">
               {/* Grid lines */}
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                  {yAxisTicksDaily.map((_, i) => (
                    <div key={i} className="w-full border-t border-zinc-100"></div>
                  ))}
               </div>

               {/* Bars */}
               <div className="relative z-10 flex-1 flex items-end gap-1 h-[calc(100%-24px)] mb-6 overflow-hidden">
                 {dailyTrends.map((d, i) => {
                   const heightPercent = (d.revenue / maxDailyRevenue) * 100
                   return (
                     <div key={i} className="flex-1 flex flex-col justify-end group h-full">
                       <div 
                         className="w-full bg-blue-500 rounded-t-[1px] hover:bg-blue-600 transition-colors relative"
                         style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '2px' : '0' }}
                       >
                         {/* Tooltip */}
                         <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none">
                           {d.date}: {d.revenue.toLocaleString('vi-VN')} đ
                         </div>
                       </div>
                     </div>
                   )
                 })}
               </div>

                {/* X-Axis Labels (rotated) */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between px-2">
                   {dailyTrends.filter((_, i) => i % Math.max(1, Math.floor(dailyTrends.length / 10)) === 0).map((d, i) => (
                     <span key={i} className="text-[9px] text-zinc-400 rotate-[-45deg] origin-top-left translate-y-1 block max-w-[40px] truncate">
                       {d.date}
                     </span>
                   ))}
                </div>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Structure Chart - takes 1 column */}
      <Card className="md:col-span-1 bg-white flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-800">
            <Layers className="size-5 text-indigo-500" />
            Cơ cấu Nhóm Gói
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-6 pt-4 px-6 flex flex-col relative">
           <div className="flex-1 flex gap-2 w-full h-[300px]">
             {/* Y-Axis */}
             <div className="flex flex-col justify-between items-end pr-2 text-xs text-zinc-500 min-w-[40px] pb-6">
                {yAxisTicksPackage.map((tick, i) => (
                  <span key={i}>{formatVNDShort(tick)}</span>
                ))}
             </div>
             
             {/* Chart Area */}
             <div className="relative flex-1 flex items-end justify-center gap-4 sm:gap-6 border-b border-zinc-200 pb-0 px-2 sm:px-6">
               {/* Grid lines */}
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                  {yAxisTicksPackage.map((_, i) => (
                    <div key={i} className="w-full border-t border-zinc-100"></div>
                  ))}
               </div>

               {/* Bars */}
               <div className="relative z-10 flex-1 flex items-end justify-between h-[calc(100%-24px)] mb-6">
                 {packageStructure.map((d, i) => {
                   const heightPercent = (d.revenue / maxPackageRevenue) * 100
                   return (
                     <div key={i} className="flex-1 flex flex-col items-center justify-end group h-full px-2 max-w-[80px]">
                       <div 
                         className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors relative"
                         style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '2px' : '0' }}
                       >
                         {/* Tooltip */}
                         <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none">
                           {d.name}: {d.revenue.toLocaleString('vi-VN')} đ
                         </div>
                       </div>
                       
                     </div>
                   )
                 })}
               </div>

                {/* X-Axis Labels */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between px-2 sm:px-6 py-1 h-6">
                   {packageStructure.map((d, i) => (
                     <span key={i} className="flex-1 text-center text-xs text-zinc-500 font-medium">
                       {d.name.replace('_', ' ')}
                     </span>
                   ))}
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
