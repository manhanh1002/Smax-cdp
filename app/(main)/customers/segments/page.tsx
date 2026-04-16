import { createClient } from '@/lib/supabase/server'
import SegmentBuilder from '@/components/customers/SegmentBuilder'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AVAILABLE_PACKAGES = ['PRO', 'ZALO_ZNS', 'GEN_AI']

export default async function SegmentsPage() {
  const supabase = await createClient()

  // Fetch segments and modules sequentially to avoid concurrent VIEW queries
  const { data: segments, error } = await supabase
    .from('dynamic_segments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching segments:', error)
  }

  const { data: moduleData } = await supabase
    .from('unique_ga4_modules')
    .select('page_title')

  const uniqueModules = moduleData?.map((m: any) => m.page_title) || []

  // Note: segment counts are computed client-side by SegmentBuilder via previewSegment()
  // This avoids heavy concurrent queries against the customer_profiles VIEW

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full pb-10">
      <div className="flex items-center gap-4 mb-2 border-b border-zinc-100 pb-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
            <ArrowLeft className="size-5 text-zinc-600" />
          </Button>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-sans">Dynamic Segmentation</h1>
          <p className="text-zinc-500 font-medium tracking-tight">
            Build and manage custom rules to filter your 360-degree customer data.
          </p>
        </div>
      </div>

      <SegmentBuilder
        initialSegments={segments || []}
        availableModules={uniqueModules}
        availablePackages={AVAILABLE_PACKAGES}
      />
    </div>
  )
}
