'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OverviewTab } from './OverviewTab'
import { RevenueTab } from './RevenueTab'
import { MarketingTab } from './MarketingTab'
import { ProductAdoptionTab } from './ProductAdoptionTab'
import { LifecycleTab } from './LifecycleTab'
import {
  BarChart3, DollarSign, Megaphone, Layers, Users,
} from 'lucide-react'

interface AnalyticsTabsProps {
  overviewData: React.ComponentProps<typeof OverviewTab>['data'] | null
  revenueData: React.ComponentProps<typeof RevenueTab>['data'] | null
  marketingData: React.ComponentProps<typeof MarketingTab>['data'] | null
  productData: React.ComponentProps<typeof ProductAdoptionTab>['data'] | null
  lifecycleData: React.ComponentProps<typeof LifecycleTab>['data'] | null
}

const tabs = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'revenue', label: 'Doanh thu', icon: DollarSign },
  { id: 'marketing', label: 'Tiếp thị', icon: Megaphone },
  { id: 'product', label: 'Sản phẩm', icon: Layers },
  { id: 'lifecycle', label: 'Vòng đời', icon: Users },
]

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 animate-pulse">
            <div className="w-9 h-9 bg-zinc-100 rounded-xl mb-3" />
            <div className="w-16 h-3 bg-zinc-100 rounded mb-2" />
            <div className="w-24 h-5 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-6 animate-pulse">
            <div className="w-40 h-4 bg-zinc-100 rounded mb-4" />
            <div className="w-full h-[260px] bg-zinc-50 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TabEmpty({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="bg-zinc-100 rounded-2xl p-4 mb-4">
        <BarChart3 className="size-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-700">Không có dữ liệu cho tab {tab}</h3>
      <p className="text-sm text-zinc-400 mt-1 max-w-md">
        Có thể do lỗi kết nối hoặc chưa có data trong database. Thử reload lại trang.
      </p>
    </div>
  )
}

export function AnalyticsTabs({
  overviewData,
  revenueData,
  marketingData,
  productData,
  lifecycleData,
}: AnalyticsTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="bg-white border border-zinc-100 shadow-sm rounded-xl p-1 w-full flex gap-0.5">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-500 rounded-lg transition-all
              data-[active]:bg-zinc-900 data-[active]:text-white data-[active]:shadow-sm
              hover:bg-zinc-50 hover:text-zinc-700"
          >
            <tab.icon className="size-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overviewData ? <OverviewTab data={overviewData} /> : <TabEmpty tab="Tổng quan" />}
      </TabsContent>
 
      <TabsContent value="revenue" className="mt-6">
        {revenueData ? <RevenueTab data={revenueData} /> : <TabEmpty tab="Doanh thu" />}
      </TabsContent>
 
      <TabsContent value="marketing" className="mt-6">
        {marketingData ? <MarketingTab data={marketingData} /> : <TabEmpty tab="Tiếp thị" />}
      </TabsContent>
 
      <TabsContent value="product" className="mt-6">
        {productData ? <ProductAdoptionTab data={productData} /> : <TabEmpty tab="Sản phẩm" />}
      </TabsContent>
 
      <TabsContent value="lifecycle" className="mt-6">
        {lifecycleData ? <LifecycleTab data={lifecycleData} /> : <TabEmpty tab="Vòng đời" />}
      </TabsContent>
    </Tabs>
  )
}
