"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, CreditCard, MousePointerClick, Phone, Mail, Link as LinkIcon, Building2, Tag } from "lucide-react"

interface CustomerSheetProps {
  customer: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CustomerSheet({ customer, open, onOpenChange }: CustomerSheetProps) {
  if (!customer) return null

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0)
  }

  const transactions = Array.isArray(customer.transactions) ? customer.transactions : []
  const rawModuleUsage = Array.isArray(customer.module_usage) ? customer.module_usage : []

  // Aggregate module usage by unique title
  const moduleUsage = rawModuleUsage.reduce((acc: any[], current: any) => {
    const title = current.title || "Unknown Page"
    const existing = acc.find(item => item.title === title)

    let cleanPath = current.path_suffix || "/"
    const parts = cleanPath.split('/')
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]
      if (lastPart.length >= 20 || /^[0-9a-f]{20,}$/i.test(lastPart)) {
        cleanPath = parts.slice(0, parts.length - 1).join('/')
      }
    }

    if (existing) {
      existing.users += (current.users || 0)
      existing.events += (current.events || 0)
      if (cleanPath.length < existing.path_suffix.length) {
        existing.path_suffix = cleanPath
      }
    } else {
      acc.push({
        ...current,
        title,
        path_suffix: cleanPath,
        users: current.users || 0,
        events: current.events || 0
      })
    }
    return acc
  }, [])

  // Helper to calculate days remaining accurately
  const getDaysRemaining = (expiryDate: string) => {
    if (!expiryDate) return 0
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* 
        Width is now set to 900px on desktop (roughly double the original 400px) 
        Removed the hardcoded max-w-sm in the base Sheet component to allow this to work.
      */}
      <SheetContent className="w-full sm:max-w-[700px] lg:max-w-[900px] overflow-y-auto bg-zinc-50/50 p-0 border-l border-zinc-200 shadow-2xl">
        <div className="bg-white p-6 border-b border-zinc-100 flex flex-col gap-4 sticky top-0 z-50">
          <SheetHeader className="text-left space-y-0">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                {customer.current_plan || "Unknown Plan"}
              </Badge>
              {customer.biz_status && (
                <Badge variant="outline" className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider">
                  {customer.biz_status}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-3xl font-extrabold tracking-tight text-zinc-900">
              {customer.biz_name || "Unknown Business"}
            </SheetTitle>
            <SheetDescription className="text-zinc-500 font-medium">
              Customer 360 Intelligence Profile
            </SheetDescription>
          </SheetHeader>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 shadow-sm">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">LTV (Revenue)</div>
              <div className="text-xl font-black text-emerald-600 truncate">{formatVND(customer.total_revenue_vnd)}</div>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 shadow-sm">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Orders</div>
              <div className="text-xl font-black text-zinc-900">{customer.transaction_count}</div>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 shadow-sm">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">All Time Traffic</div>
              <div className="text-xl font-black text-blue-600">{(customer.total_visitors_all_time || 0).toLocaleString()}</div>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 shadow-sm">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">All Time Events</div>
              <div className="text-xl font-black text-blue-600">{(customer.total_events_all_time || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full bg-zinc-200/50 p-1 mb-6 rounded-xl">
              <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="transactions" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Purchase Journey</TabsTrigger>
              <TabsTrigger value="behavior" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">GA4 Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="size-4 text-zinc-400" /> General Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1"><Phone className="size-3" /> Phone</span>
                    <span className="font-semibold text-zinc-900">{customer.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1"><Mail className="size-3" /> Email</span>
                    <span className="font-semibold text-zinc-900">{customer.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1"><LinkIcon className="size-3" /> URL Alias</span>
                    <a href={customer.alias_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold break-all">
                      {customer.alias_url ? (customer.alias_url.length > 30 ? customer.alias_url.substring(0, 30) + "..." : customer.alias_url) : "-"}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="size-4 text-zinc-400" /> Subscription & Marketing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Gói hiện tại</span>
                    <Badge className="bg-blue-100 text-blue-800 border-none px-3 py-1 font-black">
                      {customer.current_plan || "FREE"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Hết hạn Bản quyền (Pro)</span>
                    <span className="font-bold text-zinc-900 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-amber-500" />
                      {customer.last_expiry_date ? new Date(customer.last_expiry_date).toLocaleDateString("vi-VN") : "Chưa có"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Ngày còn lại (Pro)</span>
                    <span className="font-bold text-zinc-900 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-blue-500" />
                      {customer.last_expiry_date ? getDaysRemaining(customer.last_expiry_date) : 0} Ngày
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-50 col-span-full"></div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Hết hạn Dùng thử (Free)</span>
                    <span className="font-bold text-zinc-900 flex items-center gap-3">
                       <Calendar className="size-3 text-zinc-400" />
                       {customer.trial_expiry_date ? new Date(customer.trial_expiry_date).toLocaleDateString("vi-VN") : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Nguồn Marketing</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {customer.marketing_source || "Organic"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-zinc-500 flex items-center gap-2 mb-1">Campaign</span>
                    <span className="font-semibold text-zinc-900">{customer.marketing_campaign || "-"}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-0">
              <div className="relative pl-8 pb-10 pt-4">
                {/* Vertical Timeline Line - High end gradient */}
                <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/50 via-zinc-200 to-transparent z-0" />

                <div className="space-y-8">
                  {transactions.length > 0 ? [...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: any, idx: number) => (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot - Glassmorphism */}
                      <div className="absolute -left-[25px] mt-1.5 size-[18px] rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10 transition-transform group-hover:scale-125" />

                      {/* Glass Card */}
                      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                                SUCCESSFUL PURCHASE
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <Calendar className="size-3" /> {new Date(t.date).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                            <h4 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                              {t.package_name || "Enterprise Subscription"}
                            </h4>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-black text-zinc-900 tabular-nums">
                              {formatVND(t.amount_vnd)}
                            </div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                              Payment ID: #TRANS_{idx + 1024}
                            </div>
                          </div>
                        </div>

                        {/* Real Transaction Detail Bar */}
                        <div className="mt-4 pt-4 border-t border-zinc-100/50 flex items-center justify-between text-[11px] font-medium text-zinc-500">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 font-black text-zinc-600">
                              <div className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> 
                              HẾT HẠN: {t.expiry_date ? new Date(t.expiry_date).toLocaleDateString("vi-VN") : "N/A"}
                            </span>
                            <span className="flex items-center gap-1.5 font-black text-zinc-600">
                              <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" /> 
                              THỜI HẠN: {t.days_remaining || getDaysRemaining(t.expiry_date)} NGÀY
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px] px-2">
                            PAID CASE
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-zinc-200">
                      <CreditCard className="size-10 text-zinc-200 mx-auto mb-4" />
                      <p className="text-zinc-400 font-medium">Chưa có lịch sử giao dịch được ghi nhận</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="behavior">
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-zinc-50 border-b border-zinc-100 font-semibold text-sm text-zinc-500 flex items-center gap-2">
                  <MousePointerClick className="size-4" /> Most Used Modules / Pages (All Time)
                </div>
                <div className="divide-y divide-zinc-100">
                  {moduleUsage.length > 0 ? [...moduleUsage].sort((a: any, b: any) => b.events - a.events).map((m: any, idx: number) => (
                    <div key={idx} className="p-4 hover:bg-zinc-50/50 transition-colors flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 truncate">{m.title || "Unknown Page"}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1 break-all">{m.path_suffix || "/"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-blue-600">{m.users.toLocaleString()} <span className="text-[10px] text-zinc-400 font-bold uppercase">Usr</span></div>
                        <div className="text-sm font-black text-emerald-600">{m.events.toLocaleString()} <span className="text-[10px] text-zinc-400 font-bold uppercase">Evt</span></div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-zinc-500 font-medium">
                      No Google Analytics data recorded for this customer.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
