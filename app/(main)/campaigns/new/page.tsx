import { getSegments } from "@/lib/actions/segments"
import NewCampaignWizard from "@/components/campaigns/new-campaign-wizard"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function NewCampaignPage() {
  const { data: segments } = await getSegments()

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
          <p className="text-muted-foreground">
            Follow the steps to set up your automation.
          </p>
        </div>
      </div>

      <NewCampaignWizard segments={segments || []} />
    </div>
  )
}
