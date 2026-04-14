"use client"

import { login } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Lock, Mail, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex min-h-screen selection:bg-zinc-200">
      {/* Left side - Aesthetic Branding */}
      <div className="hidden lg:flex w-1/2 bg-zinc-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-8">
            <ShieldCheck className="size-3 text-emerald-500" /> Secure Enterprise Access
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.9]">
            Smax <span className="text-zinc-500">Analytics</span>
          </h1>
          <p className="mt-8 text-xl text-zinc-400 font-medium leading-relaxed">
            The mission-critical intelligence platform for modern business operations and customer lifecycle management.
          </p>
          
          <div className="mt-20 grid grid-cols-2 gap-8 border-t border-zinc-800 pt-12">
            <div>
              <div className="text-3xl font-black text-white">438K+</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Events Tracked/Mo</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">2.4B+</div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">VND Revenue Managed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Access Portal</h2>
            <p className="text-zinc-500 font-medium italic text-sm">Welcome back. Enter your credentials to verify identity.</p>
          </div>

          <form action={login} onSubmit={() => setIsLoading(true)} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Work Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@smax.app"
                    required
                    className="h-14 pl-12 rounded-xl border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:ring-zinc-900 transition-all text-lg font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Password</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="h-14 pl-12 rounded-xl border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:ring-zinc-900 transition-all text-lg font-medium"
                  />
                </div>
              </div>
            </div>

            {searchParams?.message && (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600 border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="size-2 rounded-full bg-rose-500 animate-pulse" />
                {searchParams.message}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-zinc-200 transition-all active:scale-[0.98] group"
            >
              {isLoading ? "Verifying..." : (
                <>
                  Connect to Dashboard
                  <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-8 border-t border-zinc-100 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-tighter">
              <ShieldCheck className="size-3" /> System Status: Operational
            </div>
            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-widest">
              Restricted to authorized personnel only. Registration is managed by system administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
