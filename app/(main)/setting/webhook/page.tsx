'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Webhook, ShieldCheck, Database, Info } from "lucide-react"

export default function WebhookSetting() {
  const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/webhook-ingestion`

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Webhook Settings</h1>
        <p className="text-zinc-500">
          Configure direct data ingestion from n8n to bypass Google Sheets.
        </p>
      </div>

      <Card className="border-blue-100 bg-blue-50/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Webhook size={120} />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Production</Badge>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Active</Badge>
          </div>
          <CardTitle className="text-xl flex items-center gap-2">
            Ingestion Endpoint
          </CardTitle>
          <CardDescription>
            Use this URL in your n8n Webhook node (HTTP Method: POST)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-white border border-blue-100 rounded-xl shadow-sm">
            <code className="flex-1 text-sm font-mono text-blue-600 break-all">
              {WEBHOOK_URL}
            </code>
            <Button variant="ghost" size="icon" className="shrink-0 hover:bg-blue-50 text-blue-600" onClick={() => navigator.clipboard.writeText(WEBHOOK_URL)}>
              <Copy className="size-4" />
            </Button>
          </div>
          
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="size-4 text-green-600" />
              Authentication Header
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase w-24">Header</span>
                <code className="text-sm font-mono text-zinc-900">X-Webhook-Secret</code>
              </div>
              <div className="flex-1 flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-xs font-bold text-zinc-400 uppercase w-24">Value</span>
                <code className="text-sm font-mono text-green-600">smax_vps_webhook_2024</code>
                <Button variant="ghost" size="icon" className="shrink-0 ml-auto h-6 w-6" onClick={() => navigator.clipboard.writeText('smax_vps_webhook_2024')}>
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="biz_plan" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 p-1 bg-zinc-100 rounded-xl">
              <TabsTrigger value="biz_plan" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Biz Plan</TabsTrigger>
              <TabsTrigger value="purchased_plan" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Purchased Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="biz_plan">
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="size-4 text-zinc-400" />
                    Biz Plan Payload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-zinc-900 rounded-xl text-zinc-300 text-xs overflow-auto font-mono leading-relaxed">
{`{
  "type": "biz_plan",
  "data": {
    "biz_name": "Smax AI",
    "email": "contact@smax.io",
    "phone": "0987654321",
    "current_plan": "Pro",
    "conversion_date": "2024-04-12",
    "alias_url": "smax-ai",
    "website": "smax.io",
    "company_size": "10-50",
    "status": "Active"
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchased_plan">
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="size-4 text-zinc-400" />
                    Purchased Plan Payload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-zinc-900 rounded-xl text-zinc-300 text-xs overflow-auto font-mono leading-relaxed">
{`{
  "type": "purchased_plan",
  "data": {
    "biz_name": "Smax AI",
    "alias_url": "smax-ai",
    "package_name": "Advance Module",
    "is_first_purchase": true,
    "amount_usd": 150,
    "amount_vnd": 3750000,
    "purchase_date": "2024-04-12",
    "expiry_date": "2025-04-12"
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="size-4 text-blue-500" />
                n8n Setup Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 space-y-4">
              <div className="space-y-2">
                <p className="font-medium text-zinc-900">1. HTTP Request Node</p>
                <p>Set Method to <strong>POST</strong> and URL to the Ingestion Endpoint.</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-zinc-900">2. Headers</p>
                <p>Add <code>X-Webhook-Secret</code> to the headers list.</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-zinc-900">3. JSON Body</p>
                <p>Ensure your body matches the structure in the examples.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
