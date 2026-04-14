import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowDownToLine, TrendingUp } from 'lucide-react'

interface ScorecardsProps {
  data: {
    totalRevenue: number
    newBizCount: number
    newBizRevenue: number
    renewalBizCount: number
    renewalBizRevenue: number
  }
}

export function Scorecards({ data }: ScorecardsProps) {
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value).replace('₫', 'đ')
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Revenue Card */}
      <Card className="border-l-4 border-l-blue-600 bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-500">
              Tổng doanh thu (VNĐ)
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {formatVND(data.totalRevenue)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* New Business Card */}
      <Card className="border-l-4 border-l-emerald-500 relative bg-white">
        <CardContent className="p-6 flex justify-between items-end h-full">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-500">
              Biz mới mua lần đầu
            </span>
            <span className="text-2xl font-bold text-emerald-600">
              {data.newBizCount}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <ArrowDownToLine className="size-4 text-zinc-400 absolute top-6 right-6" />
            <span className="text-sm font-bold text-emerald-600 mt-6">
              {formatVND(data.newBizRevenue)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Renewed Business Card */}
      <Card className="border-l-4 border-l-cyan-500 relative bg-white">
        <CardContent className="p-6 flex justify-between items-end h-full">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-500">
              Biz gia hạn
            </span>
            <span className="text-2xl font-bold text-cyan-500">
              {data.renewalBizCount}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TrendingUp className="size-4 text-zinc-400 absolute top-6 right-6" />
            <span className="text-sm font-bold text-cyan-500 mt-6">
              {formatVND(data.renewalBizRevenue)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
