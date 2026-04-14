import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Play, Zap, Webhook, FileSpreadsheet, Users } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import CampaignActions from "@/components/campaigns/campaign-actions"
import { cn } from "@/lib/utils"

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, dynamic_segments(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto w-full pb-10 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 font-sans">Campaign Automation</h1>
          <p className="text-zinc-500 font-medium tracking-tight">
            Orchestrate data flow from smart segments to your external ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/customers/segments">
            <Button variant="outline" className="rounded-xl border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 px-6 py-6 transition-all shadow-sm">
              <Users className="mr-2 h-4 w-4" /> Manage Segments
            </Button>
          </Link>
          <Link href="/campaigns/new">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-8 py-6 font-bold shadow-lg shadow-zinc-200 transition-all hover:scale-[1.02]">
              <Plus className="mr-2 h-5 w-5" /> Create Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((campaign) => (
          <Card key={campaign.id} className="p-0 border-0 shadow-lg shadow-zinc-200/50 bg-white rounded-[2rem] overflow-hidden group hover:scale-[1.01] transition-all duration-300">
            <div className={cn(
               "h-1.5 w-full",
               campaign.status === 'active' ? "bg-emerald-500" : "bg-zinc-200"
            )} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className={cn(
                  "px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border-0",
                  campaign.status === 'active' ? "bg-emerald-100 text-emerald-700 font-black" : "bg-zinc-100 text-zinc-500"
                )}>
                  {campaign.status}
                </Badge>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                   {campaign.trigger_mode === 'bulk' ? <RefreshCw className="h-4 w-4" /> : <Zap className="h-4 w-4 fill-indigo-500 text-indigo-500" />}
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{campaign.trigger_mode}</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-zinc-900 tracking-tight mb-2 truncate">
                {campaign.name}
              </h3>

              <div className="flex items-center gap-3 mb-6">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Target Segment</div>
                <div className="text-sm font-bold text-zinc-700 bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-100">
                  {campaign.dynamic_segments?.name || 'Deleted'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Action Protocol</div>
                  <div className="flex items-center gap-1.5">
                    {campaign.action_type === 'n8n' ? (
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase">
                        <Webhook className="h-3.5 w-3.5" /> n8n
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Sheets
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Last Sync</div>
                  <div className="text-xs font-bold text-zinc-700 leading-none">
                    {campaign.last_run ? new Date(campaign.last_run).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </div>
                </div>
              </div>

              <CampaignActions 
                campaignId={campaign.id} 
                currentStatus={campaign.status} 
                triggerMode={campaign.trigger_mode}
              />
            </div>
          </Card>
        ))}

        {(!campaigns || campaigns.length === 0) && (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border-0 shadow-lg shadow-zinc-200/50 flex flex-col items-center justify-center">
            <div className="bg-zinc-100 p-6 rounded-[2rem] mb-6">
              <RefreshCw className="h-12 w-12 text-zinc-300 animate-spin-slow" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">No Active Campaigns</h3>
            <p className="text-zinc-500 mt-2 font-medium tracking-tight">
              Start by selecting a segment and connecting it to your favorite automation apps.
            </p>
            <Link href="/campaigns/new" className="mt-8">
              <Button variant="outline" className="rounded-xl border-2 border-zinc-200 px-8 py-6 font-bold hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
