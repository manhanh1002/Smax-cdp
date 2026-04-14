"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createCampaign(campaign: {
  name: string
  segment_id: string
  trigger_mode: 'bulk' | 'realtime'
  batch_size: number
  action_type: 'n8n' | 'googlesheet'
  action_config: any
  status: 'active' | 'paused'
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaign)
    .select()

  if (error) {
    console.error('Error creating campaign:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/campaigns')
  return { success: true, data: data[0] }
}

export async function toggleCampaignStatus(id: string, currentStatus: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'active' ? 'paused' : 'active'

  const { error } = await supabase
    .from('campaigns')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) {
    console.error('Error updating campaign status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/campaigns')
  return { success: true }
}
