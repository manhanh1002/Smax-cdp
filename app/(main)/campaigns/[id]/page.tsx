import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, XCircle, Clock, Zap } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CampaignLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch Campaign Info
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, dynamic_segments(name)')
    .eq('id', id)
    .single()

  // 2. Fetch Logs
  const { data: logs } = await supabase
    .from('campaign_logs')
    .select('*')
    .eq('campaign_id', id)
    .order('sent_at', { ascending: false })
    .limit(100)

  if (!campaign) {
    return <div className="p-8 text-center">Campaign not found</div>
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-8">
        <div className="flex items-center gap-6">
          <Link href="/campaigns">
            <Button variant="outline" size="icon" className="rounded-2xl border-2 border-zinc-100 hover:border-blue-500 hover:bg-blue-50 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-zinc-900">{campaign.name}</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-3 font-bold uppercase tracking-widest text-[10px]">
                {campaign.trigger_mode}
              </Badge>
            </div>
            <p className="text-zinc-500 font-medium mt-1">
              Deep dive into the execution stream and delivery performance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-2xl shadow-blue-500/10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black truncate">{campaign.dynamic_segments?.name}</div>
            <div className="mt-2 text-xs font-medium text-blue-200/80 italic">Filtering logic applied based on segment rules</div>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200/60 shadow-xl shadow-zinc-200/5 hover:border-zinc-300 transition-all bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-zinc-900">{logs?.length || 0} <span className="text-sm font-bold text-zinc-400">profiles</span></div>
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
              <Clock className="h-3 w-3" />
              Synced in real-time
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/60 shadow-xl shadow-zinc-200/5 bg-white/50 backdrop-blur-sm overflow-hidden border-r-4 border-r-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Reliability Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600">
              {logs?.length ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100) : 0}%
            </div>
            <div className="mt-2 text-xs font-bold text-zinc-400 uppercase tracking-tighter">System Uptime Optimal</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200/60 shadow-2xl shadow-zinc-200/10 overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black tracking-tight text-zinc-900">Execution Stream</CardTitle>
            <Badge className="bg-zinc-900 text-white px-4 font-bold rounded-lg py-1">LIVE VIEW</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 border-b border-zinc-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Customer Identity</TableHead>
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Protocol Status</TableHead>
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Sync Timestamp</TableHead>
                  <TableHead className="py-4 pr-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Payload Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-blue-50/30 transition-colors border-b border-zinc-50">
                    <TableCell className="py-4 pl-8 font-extrabold font-mono text-xs text-zinc-500 group-hover:text-blue-600 transition-colors">{log.external_id}</TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex justify-center">
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="h-3 w-3" /> PASS
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider">
                            <XCircle className="h-3 w-3" /> FAIL
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs font-bold text-zinc-400">
                      {new Date(log.sent_at).toLocaleString('vi-VN', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="py-4 pr-8 max-w-[300px] truncate text-xs font-medium text-zinc-500 group-hover:text-zinc-900 transition-colors italic">
                      {log.error || "Package delivered to destination endpoint successfully."}
                    </TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center bg-zinc-50/20">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-lg">
                          <Clock className="h-8 w-8 text-zinc-200 animate-pulse" />
                        </div>
                        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Awaiting primary execution stream...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
