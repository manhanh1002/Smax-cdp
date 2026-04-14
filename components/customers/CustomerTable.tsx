"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Info, Users, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, X, Download, Coins, Zap, UserCircle, Layers } from "lucide-react"
import { exportCustomersToCSV } from "@/lib/actions/customers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import CustomerSheet from "./CustomerSheet"

interface CustomerTableProps {
  initialData: any[]
  totalCount: number
  currentPage: number
  pageSize: number
  segments: any[]
  stats: {
    totalRevenue: number
    proCount: number
    freeCount: number
    miscPaidRevenue: number
    recordsFetched: number
  }
}

export default function CustomerTable({ initialData, totalCount, currentPage, pageSize, segments, stats }: CustomerTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchVal, setSearchVal] = useState(searchParams.get("search") || "")
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const activeSegment = searchParams.get("segmentId") || "all"
  const activePlan = searchParams.get("plan") || "all"
  const activeGA4 = searchParams.get("ga4") || "all"
  const activeTrial = searchParams.get("trial") || "all"
  const activePackage = searchParams.get("package") || "all"

  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize

  const updateQueryParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "all") {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })

    // Always reset to page 1 on filter/search change
    if (!params.page) {
      newParams.set("page", "1")
    }

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateQueryParams({ search: searchVal || null })
  }

  const clearFilters = () => {
    setSearchVal("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  const goToPage = (page: number) => {
    updateQueryParams({ page: page.toString() })
  }

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const csv = await exportCustomersToCSV({
        search: searchParams.get("search") || undefined,
        segmentId: searchParams.get("segmentId") || undefined,
        plan: searchParams.get("plan") || undefined,
        ga4: searchParams.get("ga4") || undefined,
        trial: searchParams.get("trial") || undefined,
        package: searchParams.get("package") || undefined,
      })

      if (typeof csv !== 'string') return

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export failed:', error)
      alert("Failed to export CSV. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const getPlanBadge = (plan: string) => {
    const defaultClass = "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
    if (!plan) return <Badge className={defaultClass}>Unknown</Badge>
    const p = plan.toUpperCase()
    if (p === "PRO") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 uppercase font-black">PRO</Badge>
    if (p === "FREE") return <Badge variant="outline" className="text-zinc-500 uppercase font-bold">FREE</Badge>
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 uppercase font-bold">{plan}</Badge>
  }

  const hasActiveFilters = searchVal || activeSegment !== "all" || activePlan !== "all" || activeGA4 !== "all" || activeTrial !== "all" || activePackage !== "all"

  return (
    <div className="space-y-6">
      {/* Score Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total FREE */}
        <Card className="p-5 border-0 shadow-lg shadow-zinc-200/50 bg-white rounded-[2rem] flex items-center gap-5 group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-zinc-400 p-4 rounded-2xl shadow-xl shadow-zinc-200 group-hover:bg-zinc-500 transition-colors">
            <UserCircle className="size-8 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Total FREE</div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {stats.freeCount.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="p-5 border-0 shadow-lg shadow-zinc-200/50 bg-white rounded-[2rem] flex items-center gap-5 group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-amber-400 p-4 rounded-2xl shadow-xl shadow-amber-200 group-hover:bg-amber-500 transition-colors">
            <Coins className="size-8 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">TOTAL REVENUE (LTV)</div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {formatVND(stats.totalRevenue)}
            </div>
          </div>
        </Card>

        {/* PRO Users */}
        <Card className="p-5 border-0 shadow-lg shadow-zinc-200/50 bg-white rounded-[2rem] flex items-center gap-5 group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-indigo-500 p-4 rounded-2xl shadow-xl shadow-indigo-200 group-hover:bg-indigo-600 transition-colors">
            <Zap className="size-8 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">PRO Audience</div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {stats.proCount.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* Misc. Revenue (Non-PRO) */}
        <Card className="p-5 border-0 shadow-lg shadow-zinc-200/50 bg-white rounded-[2rem] flex items-center gap-5 group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-rose-500 p-4 rounded-2xl shadow-xl shadow-rose-200 group-hover:bg-rose-600 transition-colors">
            <Layers className="size-8 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Misc. Revenue</div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {formatVND(stats.miscPaidRevenue)}
            </div>
          </div>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
            Live Filters Active
          </Badge>
          <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            {isPending ? "Syncing audience..." : "Audience Synchronized"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="rounded-xl border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50"
          >
            {isExporting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2 text-emerald-600" />}
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
          <Link href="/customers/segments">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-6 font-bold shadow-lg shadow-zinc-200">
              <Filter className="size-4 mr-2" /> Manage Segments
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border-0 shadow-sm bg-white rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              placeholder="Search customers... (Enter)"
              className="pl-9 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500 rounded-xl"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </form>

          {/* Segment Filter */}
          <Select value={activeSegment} onValueChange={(val) => updateQueryParams({ segmentId: val })}>
            <SelectTrigger className="w-[180px] bg-zinc-50 border-zinc-200 rounded-xl font-medium">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              {segments.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Plan Filter */}
          <Select disabled={activeSegment !== "all"} value={activePlan} onValueChange={(val) => updateQueryParams({ plan: val })}>
            <SelectTrigger className={`w-[140px] bg-zinc-50 border-zinc-200 rounded-xl font-medium ${activeSegment !== "all" ? "opacity-50 grayscale cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="PRO">PRO</SelectItem>
              <SelectItem value="FREE">FREE</SelectItem>
            </SelectContent>
          </Select>

          {/* GA4 Filter */}
          <Select disabled={activeSegment !== "all"} value={activeGA4} onValueChange={(val) => updateQueryParams({ ga4: val })}>
            <SelectTrigger className={`w-[140px] bg-zinc-50 border-zinc-200 rounded-xl font-medium ${activeSegment !== "all" ? "opacity-50 grayscale cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="GA4 Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">GA4: Any</SelectItem>
              <SelectItem value="yes">Has Data</SelectItem>
              <SelectItem value="no">No Data</SelectItem>
            </SelectContent>
          </Select>

          {/* Package Filter */}
          <Select disabled={activeSegment !== "all"} value={activePackage} onValueChange={(val) => updateQueryParams({ package: val })}>
            <SelectTrigger className={`w-[150px] bg-zinc-50 border-zinc-200 rounded-xl font-medium ${activeSegment !== "all" ? "opacity-50 grayscale cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Gói" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả Gói</SelectItem>
              <SelectItem value="PRO">PRO</SelectItem>
              <SelectItem value="GEN_AI">GEN_AI</SelectItem>
              <SelectItem value="ZALO_ZNS">ZALO_ZNS</SelectItem>
              <SelectItem value="FREE">FREE</SelectItem>
            </SelectContent>
          </Select>

          {/* Trial Filter */}
          <Select disabled={activeSegment !== "all"} value={activeTrial} onValueChange={(val) => updateQueryParams({ trial: val })}>
            <SelectTrigger className={`w-[160px] bg-zinc-50 border-zinc-200 rounded-xl font-medium ${activeSegment !== "all" ? "opacity-50 grayscale cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Trial Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
              <SelectItem value="Sắp hết trial">Sắp hết trial</SelectItem>
              <SelectItem value="Hết trial">Hết trial</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-zinc-500 hover:text-red-500 rounded-xl px-3 font-bold">
              <X className="size-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className={`border-0 shadow-xl bg-white rounded-2xl overflow-hidden transition-opacity duration-300 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <div className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-2">
            Dynamic Intelligence Table
          </div>
          <div className="text-sm font-semibold text-zinc-500">
            Showing <span className="text-zinc-900">{startIndex + 1}-{Math.min(startIndex + pageSize, totalCount || 0)}</span> of <span className="text-emerald-600 font-black">{(totalCount || 0).toLocaleString()}</span> customers
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow className="border-zinc-100">
                <TableHead className="font-bold text-zinc-500">Business / Contact</TableHead>
                <TableHead className="font-bold text-zinc-500">Status</TableHead>
                <TableHead className="font-bold text-zinc-500 text-right">LTV (VND)</TableHead>
                <TableHead className="font-bold text-zinc-500 text-right">All Time Traffic</TableHead>
                <TableHead className="font-bold text-zinc-500">Attribution</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length > 0 ? initialData.map((customer) => (
                <TableRow
                  key={customer.external_id || customer.alias_url || customer.phone || Math.random()}
                  className="hover:bg-zinc-50 cursor-pointer border-zinc-100 transition-colors group"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <TableCell>
                    <div className="font-bold text-zinc-900">{customer.biz_name || "Unknown Biz"}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{customer.phone || customer.email || customer.alias_url}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {getPlanBadge(customer.current_plan)}
                      {customer.biz_status && (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${customer.biz_status === 'Hết trial' ? 'bg-red-50 text-red-600 border-red-100' :
                            customer.biz_status === 'Sắp hết trial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-zinc-50 text-zinc-500 border-zinc-100'
                          }`}>
                          {customer.biz_status}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-black text-zinc-900">
                      {customer.total_revenue_vnd > 0 ? formatVND(customer.total_revenue_vnd) : "-"}
                    </div>
                    {customer.transaction_count > 0 && (
                      <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 tracking-wider">
                        {customer.transaction_count} orders
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 font-bold text-zinc-900">
                      {customer.total_visitors_all_time > 0 ? (
                        <>
                          <Users className="size-3 text-blue-500" />
                          {customer.total_visitors_all_time.toLocaleString()}
                        </>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.marketing_source ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {customer.marketing_source}
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Organic</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <Info className="size-4" />
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      {isPending ? (
                        <>
                          <Loader2 className="size-10 animate-spin text-emerald-500 mb-4" />
                          <p className="font-bold">Updating Audience...</p>
                        </>
                      ) : (
                        <>
                          <Filter className="size-10 text-zinc-200 mb-4" />
                          <p className="font-bold">No customers found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                          <Button variant="link" onClick={clearFilters} className="text-emerald-600 font-bold mt-2">Clear all filters</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/30">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest hidden md:block">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg border-zinc-200"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1 || isPending}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg border-zinc-200"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="flex items-center mx-2 gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = currentPage
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      className={`size-8 rounded-lg text-xs font-bold ${currentPage === pageNum ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-200'}`}
                      onClick={() => goToPage(pageNum)}
                      disabled={isPending}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg border-zinc-200"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg border-zinc-200"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || isPending}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <CustomerSheet
          customer={selectedCustomer}
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
        />
      </Card>
    </div>
  )
}
