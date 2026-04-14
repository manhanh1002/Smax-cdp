"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RefreshCw } from "lucide-react"
import { toggleCampaignStatus } from "@/lib/actions/campaigns"
import { toast } from "sonner"
import Link from "next/link"

interface CampaignActionsProps {
  campaignId: string
  currentStatus: string
  triggerMode: string
}

export default function CampaignActions({ campaignId, currentStatus, triggerMode }: CampaignActionsProps) {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const res = await toggleCampaignStatus(campaignId, currentStatus)
    if (res.success) {
      toast.success(`Chiến dịch đã ${currentStatus === 'active' ? 'tạm dừng' : 'bắt đầu'}`)
    } else {
      toast.error("Cập nhật trạng thái thất bại")
    }
    setLoading(false)
  }

  const handleRunBulk = async () => {
    setRunning(true)
    try {
      // Call the Edge Function via the Supabase proxy or direct URL
      // Since this is client-side, we should probably use a server action as a proxy 
      // or use the supabase client.
      
      const response = await fetch('/api/campaigns/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      })
      
      const data = await response.json()
      if (response.ok) {
        toast.success(`Đã xử lý xong: ${data.processed} khách hàng`)
      } else {
        toast.error(`Lỗi: ${data.error}`)
      }
    } catch (e) {
      toast.error("Lỗi mạng khi thực thi")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-4 w-full mt-4">
      <Link href={`/campaigns/${campaignId}`} className="flex-1">
        <Button variant="outline" size="sm" className="w-full rounded-2xl border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-100 h-12 transition-all">
          Xem Nhật ký
        </Button>
      </Link>
      
      {triggerMode === 'bulk' ? (
        <Button 
          size="sm" 
          className="flex-1 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-12 shadow-xl shadow-zinc-200 transition-all active:scale-95"
          onClick={handleRunBulk}
          disabled={running}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", running && "animate-spin")} />
          {running ? 'Đang chạy...' : 'Chạy ngay'}
        </Button>
      ) : (
        <Button 
          size="sm" 
          className={cn(
            "flex-1 rounded-2xl font-bold h-12 shadow-xl transition-all active:scale-95",
            currentStatus === 'active' 
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
          )}
          onClick={handleToggle}
          disabled={loading}
        >
          {currentStatus === 'active' ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {currentStatus === 'active' ? 'Tạm dừng' : 'Bắt đầu'}
        </Button>
      )}
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
