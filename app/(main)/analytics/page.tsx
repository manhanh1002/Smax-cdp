import React from 'react'
import {
  getOverviewData,
  getRevenueData,
  getMarketingData,
  getProductAdoptionData,
  getLifecycleData,
} from '@/lib/analytics-data'
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs'
import { BarChart3 } from 'lucide-react'

export const metadata = {
  title: 'Analytics Dashboard | Smax CDP',
  description: 'Bộ chỉ huy ra quyết định cho Sales, Marketing, và Product — tất cả trong một trang.',
}

export const revalidate = 300 // Cache 5 minutes

export default async function AnalyticsPage() {
  // Parallel fetch all tab data
  const [overviewData, revenueData, marketingData, productData, lifecycleData] = await Promise.all([
    getOverviewData(),
    getRevenueData(),
    getMarketingData(),
    getProductAdoptionData(),
    getLifecycleData(),
  ])

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-4rem)]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <BarChart3 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Analytics Command Center</h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Sales · Marketing · Product · Lifecycle — Tất cả trả lời trong 5 giây.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresh mỗi 5 phút
        </div>
      </div>

      {/* ── Tabs ── */}
      <AnalyticsTabs
        overviewData={overviewData}
        revenueData={revenueData}
        marketingData={marketingData}
        productData={productData}
        lifecycleData={lifecycleData}
      />
    </div>
  )
}
