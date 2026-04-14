'use client'

import * as React from 'react'
import {
  BarChart3,
  BookOpen,
  Command,
  FileText,
  LayoutDashboard,
  Settings2,
  Users,
  LogOut,
  Zap
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar'
import { signOut } from '@/app/auth/actions'
import Link from 'next/link'

const data = {
  user: {
    name: 'Admin User',
    email: 'admin@smax.io',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Customers',
      url: '/customers',
      icon: Users,
    },
    {
      title: 'Campaigns',
      url: '/campaigns',
      icon: Zap,
    },
  ],
  secondary: [
    {
      title: 'Reports',
      url: '#',
      icon: FileText,
    },
    {
      title: 'Documentation',
      url: '#',
      icon: BookOpen,
    },
    {
      title: 'Settings',
      url: '/setting/webhook',
      icon: Settings2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props} className="border-r border-zinc-200 bg-white">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <a href="/dashboard" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-zinc-900">Smax Analytics</span>
                  <span className="truncate text-xs text-zinc-500 font-medium">Business Intel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Main</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton render={<Link href={item.url} />} tooltip={item.title} className="hover:bg-zinc-100 text-zinc-600 hover:text-blue-600 transition-colors">
                  {item.icon && <item.icon className="size-4" />}
                  <span className="font-medium">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Support</SidebarGroupLabel>
          <SidebarMenu>
            {data.secondary.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  render={<Link href={item.url} />}
                  size="sm" 
                  className="hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {item.icon && <item.icon className="size-4" />}
                  <span className="font-medium">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-zinc-100 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" className="w-full text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all">
                <LogOut className="size-4" />
                <span className="font-medium">Logout</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
