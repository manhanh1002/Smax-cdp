import { AppSidebar } from '@/components/dashboard/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-zinc-50/50">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-zinc-200 bg-white/50 backdrop-blur-sm px-4 flex-none sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-900" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-zinc-200" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-zinc-500 hover:text-blue-600 transition-colors">
                    Smax Analytics
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-zinc-300" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-zinc-900 font-medium">Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-xs text-zinc-400 hidden sm:block">
              Authenticated as <span className="text-blue-600 font-medium">{user.email}</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
