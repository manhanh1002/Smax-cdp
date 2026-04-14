"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronRight, ChevronLeft, Webhook, FileSpreadsheet, Zap, Layers, RefreshCw, Users } from "lucide-react"
import { createCampaign } from "@/lib/actions/campaigns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface NewCampaignWizardProps {
  segments: any[]
}

export default function NewCampaignWizard({ segments }: NewCampaignWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    segment_id: "",
    trigger_mode: "bulk" as 'bulk' | 'realtime',
    batch_size: 100,
    action_type: "n8n" as 'n8n' | 'googlesheet',
    action_config: {
      webhook_url: "",
      method: "POST" as "POST" | "GET",
      spreadsheet_id: "",
      sheet_name: ""
    }
  })

  const nextStep = () => setStep((s) => s + 1)
  const prevStep = () => setStep((s) => s - 1)

  const handleSubmit = async () => {
    setLoading(true)
    const res = await createCampaign({
      name: formData.name,
      segment_id: formData.segment_id,
      trigger_mode: formData.trigger_mode,
      batch_size: formData.batch_size,
      action_type: formData.action_type,
      action_config: formData.action_config,
      status: 'active'
    })

    if (res.success) {
      toast.success("Campaign created successfully!")
      router.push("/campaigns")
    } else {
      toast.error("Failed to create campaign: " + res.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto w-full pb-10 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 border-b border-zinc-100 pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 font-sans">Deploy New Campaign</h1>
        <p className="text-zinc-500 font-medium tracking-tight">Configure your automated data pipeline in 4 simple steps.</p>
      </div>

      <div className="flex justify-between items-center px-10">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-3 group cursor-default">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-[1.2rem] border-2 font-black transition-all duration-300",
              step >= s 
                ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-200 scale-110" 
                : "border-zinc-100 text-zinc-300 bg-white"
            )}>
              {s}
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
              step >= s ? "text-zinc-900" : "text-zinc-300"
            )}>
              {s === 1 ? 'Logic' : s === 2 ? 'Audience' : s === 3 ? 'Action' : 'Finalize'}
            </span>
            {s < 4 && <div className={cn("h-0.5 w-16 mx-4 rounded-full", step > s ? "bg-zinc-900" : "bg-zinc-50")} />}
          </div>
        ))}
      </div>

      <Card className="p-0 border-0 shadow-2xl shadow-zinc-200/50 bg-white rounded-[2rem] overflow-hidden">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-50/50 border-b border-zinc-100 px-10 py-8">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-900 p-3 rounded-2xl shadow-xl shadow-zinc-200">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Step 1: Campaign Intelligence</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Foundational Logic & Timing</p>
                </div>
              </div>
            </div>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Campaign Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., High-Value Re-engagement" 
                  className="h-14 rounded-xl border-zinc-200 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-widest text-zinc-400">Trigger Protocol</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setFormData({...formData, trigger_mode: 'bulk'})}
                    className={cn(
                      "p-6 cursor-pointer rounded-2xl border-2 transition-all hover:scale-[1.02]",
                      formData.trigger_mode === 'bulk' ? "border-blue-600 bg-blue-50/50" : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("p-2 rounded-lg", formData.trigger_mode === 'bulk' ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400")}><RefreshCw className="h-5 w-5" /></div>
                      <span className="font-bold">Bulk Processing</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">Scan entire segment and export in batches. Ideal for weekly updates or one-off syncs.</p>
                  </div>
                  <div 
                    onClick={() => setFormData({...formData, trigger_mode: 'realtime'})}
                    className={cn(
                      "p-6 cursor-pointer rounded-2xl border-2 transition-all hover:scale-[1.02]",
                      formData.trigger_mode === 'realtime' ? "border-emerald-600 bg-emerald-50/50" : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("p-2 rounded-lg", formData.trigger_mode === 'realtime' ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-400")}><Zap className="h-5 w-5" /></div>
                      <span className="font-bold">Real-time Stream</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">Instant execution when a user enters the segment. Perfect for welcome emails or sales alerts.</p>
                  </div>
                </div>
              </div>

              {formData.trigger_mode === 'bulk' && (
                <div className="space-y-3 pt-4 border-t border-zinc-50 animate-in fade-in duration-300">
                  <Label htmlFor="batch_size" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Batch Size Control</Label>
                  <div className="flex items-center gap-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <Input 
                      id="batch_size" 
                      type="number"
                      className="max-w-[120px] h-12 rounded-lg border-zinc-200 font-black text-blue-600 text-center"
                      value={formData.batch_size}
                      onChange={(e) => setFormData({...formData, batch_size: parseInt(e.target.value) || 100})}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-700">Customers per iteration</span>
                      <span className="text-[10px] text-zinc-400 font-medium">Recommended: 100-500 to optimize throughput and rate limits.</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-50/50 border-b border-zinc-100 px-10 py-8">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-900 p-3 rounded-2xl shadow-xl shadow-zinc-200">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Step 2: Define Audience</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Select the target segment for this stream</p>
                </div>
              </div>
            </div>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-4">
                <Label htmlFor="segment" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Target Segment</Label>
                <Select 
                  value={formData.segment_id} 
                  onValueChange={(v) => setFormData({...formData, segment_id: v})}
                >
                  <SelectTrigger className="h-14 rounded-xl border-zinc-200 text-lg font-medium">
                    <SelectValue placeholder="Search or select a segment...">
                      {formData.segment_id ? segments.find(s => s.id === formData.segment_id)?.name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id} className="py-3 font-medium">
                        {seg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-700 text-sm font-medium leading-relaxed">
                  Tip: Use the "Manage Segments" button on the dashboard if you need to create a new audience group before continuing.
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-50/50 border-b border-zinc-100 px-10 py-8">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-900 p-3 rounded-2xl shadow-xl shadow-zinc-200">
                  <Webhook className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Step 3: Action Protocol</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Choose destination ecosystem</p>
                </div>
              </div>
            </div>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div 
                  onClick={() => setFormData({...formData, action_type: 'n8n'})}
                  className={cn(
                    "p-8 cursor-pointer rounded-3xl border-2 flex flex-col items-center text-center transition-all hover:scale-[1.02]",
                    formData.action_type === 'n8n' ? "border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-500/10" : "border-zinc-100"
                  )}
                >
                  <div className={cn("p-4 rounded-2xl mb-4 shadow-xl", formData.action_type === 'n8n' ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400")}>
                    <Webhook className="h-8 w-8" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 tracking-tight">n8n Webhook</span>
                  <p className="text-xs text-zinc-500 mt-2 font-medium">Trigger sophisticated workflows in your n8n instance.</p>
                </div>
                <div 
                  onClick={() => setFormData({...formData, action_type: 'googlesheet'})}
                  className={cn(
                    "p-8 cursor-pointer rounded-3xl border-2 flex flex-col items-center text-center transition-all hover:scale-[1.02]",
                    formData.action_type === 'googlesheet' ? "border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-500/10" : "border-zinc-100"
                  )}
                >
                  <div className={cn("p-4 rounded-2xl mb-4 shadow-xl", formData.action_type === 'googlesheet' ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-400")}>
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <span className="text-lg font-black text-zinc-900 tracking-tight">Google Sheets</span>
                  <p className="text-xs text-zinc-500 mt-2 font-medium">Auto-sync customer profiles to cloud spreadsheets.</p>
                </div>
              </div>

              {formData.action_type === 'n8n' ? (
                <div className="space-y-6 pt-6 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1 space-y-3">
                      <Label className="text-sm font-bold uppercase tracking-widest text-zinc-400">Method</Label>
                      <Select 
                        value={formData.action_config.method || "POST"} 
                        onValueChange={(v) => setFormData({
                          ...formData, 
                          action_config: {...formData.action_config, method: v as any}
                        })}
                      >
                        <SelectTrigger className="h-14 rounded-xl border-zinc-200 font-bold">
                          <SelectValue placeholder="POST" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-3">
                      <Label htmlFor="webhook_url" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Webhook URL</Label>
                      <Input 
                        id="webhook_url" 
                        placeholder="https://n8n.your-domain.com/webhook/..." 
                        className="h-14 rounded-xl border-zinc-200 font-mono text-sm"
                        value={formData.action_config.webhook_url}
                        onChange={(e) => setFormData({
                          ...formData, 
                          action_config: {...formData.action_config, webhook_url: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <Label htmlFor="ss_id" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Spreadsheet ID</Label>
                    <Input 
                      id="ss_id" 
                      placeholder="e.g., 1a2b3c4d5e..." 
                      className="h-12 rounded-xl border-zinc-200"
                      value={formData.action_config.spreadsheet_id}
                      onChange={(e) => setFormData({
                        ...formData, 
                        action_config: {...formData.action_config, spreadsheet_id: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="sheet_name" className="text-sm font-bold uppercase tracking-widest text-zinc-400">Sheet Name</Label>
                    <Input 
                      id="sheet_name" 
                      placeholder="e.g., Sheet1" 
                      className="h-12 rounded-xl border-zinc-200"
                      value={formData.action_config.sheet_name}
                      onChange={(e) => setFormData({
                        ...formData, 
                        action_config: {...formData.action_config, sheet_name: e.target.value}
                      })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-zinc-50/50 border-b border-zinc-100 px-10 py-8">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl shadow-xl shadow-emerald-200">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Step 4: Finalize Stream</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Review your automation architecture</p>
                </div>
              </div>
            </div>
            <CardContent className="p-10">
              <div className="rounded-3xl bg-zinc-50 border border-zinc-100 p-10 space-y-6">
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Campaign Identity</div>
                    <div className="text-xl font-black text-zinc-900">{formData.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Audience Target</div>
                    <div className="text-xl font-black text-zinc-900 truncate">
                      {segments.find(s => s.id === formData.segment_id)?.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Trigger Engine</div>
                    <div className="flex items-center gap-2">
                       <Badge className="bg-zinc-900 text-white font-black uppercase tracking-widest py-1 px-4 rounded-lg">
                        {formData.trigger_mode}
                       </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Action Destination</div>
                    <div className="flex items-center gap-2 text-emerald-600 font-extrabold uppercase">
                      <Zap className="h-4 w-4" /> {formData.action_type}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        <CardFooter className="flex justify-between bg-zinc-50/30 border-t border-zinc-100 px-10 py-8">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step === 1 || loading}
            className="rounded-xl border-zinc-200 font-bold px-8 py-6 hover:bg-zinc-100"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={nextStep} 
              disabled={
                (step === 1 && !formData.name) || 
                (step === 2 && !formData.segment_id) || 
                (step === 3 && formData.action_type === 'n8n' && !formData.action_config.webhook_url) ||
                (step === 3 && formData.action_type === 'googlesheet' && (!formData.action_config.spreadsheet_id || !formData.action_config.sheet_name))
              }
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-10 py-6 font-bold shadow-xl shadow-zinc-200"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 py-6 font-bold shadow-xl shadow-emerald-200"
            >
              {loading ? "Initializing..." : "Activate Stream"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
