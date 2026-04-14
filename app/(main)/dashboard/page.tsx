import { 
  getOverviewData, 
  getDashboardSidebarStats 
} from '@/lib/analytics-data'
import { OverviewTab } from '@/components/analytics/OverviewTab'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { BarChart3, Clock, Rocket } from 'lucide-react'

export const metadata = {
  title: 'Dashboard | Smax CDP',
  description: 'Trung tâm chỉ huy dữ liệu khách hàng Smax.',
}

export const revalidate = 60 // Update every minute for real-time feel

export default async function DashboardPage() {
  // Parallel fetch both datasets
  const [overviewData, sidebarData] = await Promise.all([
    getOverviewData(),
    getDashboardSidebarStats(),
  ])

  if (!overviewData || !sidebarData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-zinc-100 p-4 rounded-2xl mb-4">
          <BarChart3 className="size-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Không có dữ liệu</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm">
          Vui lòng kiểm tra lại kết nối Supabase hoặc cấu hình đồng bộ dữ liệu GA4/Sheets.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ── Dashboard Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 p-3 rounded-2xl shadow-xl shadow-zinc-200">
            <Rocket className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Smax Intelligence Dashboard</h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5 flex items-center gap-1.5">
              <Clock className="size-3" />
              Dữ liệu hợp nhất GA4 & Google Sheets · Cập nhật mỗi 60 giây
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Status</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dữ liệu đang Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Unified Container ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border border-zinc-200/60 rounded-[2.5rem] bg-white overflow-hidden shadow-sm">
        
        {/* Left Column: Analytics Overview (3/4) */}
        <div className="lg:col-span-3 p-6 lg:p-10 flex flex-col gap-10">
           <OverviewTab data={overviewData} />
           
           {/* Additional Context/Help Card */}
           <div className="bg-zinc-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
             <div className="relative z-10">
               <h3 className="text-lg font-bold mb-2 font-sans tracking-tight">Cần tuỳ chỉnh báo cáo?</h3>
               <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
                 Hệ thống CDP có thể kết nối thêm các nguồn dữ liệu từ Facebook Ads API, CRM hoặc Chatbot. 
                 Hãy liên hệ đội ngũ Kỹ thuật nếu muốn đo lường sâu hơn.
               </p>
               <button className="mt-6 bg-white text-zinc-900 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors shadow-lg">
                 Yêu cầu Custom Dashboard
               </button>
             </div>
           </div>
        </div>

        {/* Right Column: Real-time Stats Sidebar (1/4) with subtle background */}
        <aside className="lg:col-span-1 bg-zinc-50/50 border-t lg:border-t-0 lg:border-l border-zinc-100 p-6 lg:p-8">
          <div className="sticky top-10">
            <DashboardSidebar data={sidebarData} />
          </div>
        </aside>

      </div>
    </div>
  )
}
