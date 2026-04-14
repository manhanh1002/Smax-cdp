"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveSegment(segment: any) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dynamic_segments')
    .insert({
      name: segment.name,
      description: segment.description,
      rules: segment.rules,
      match_type: segment.matchType
    })
    .select()

  if (error) {
    console.error('Error saving segment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/customers/segments')
  revalidatePath('/customers')
  
  return { success: true, data }
}
export async function getSegments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dynamic_segments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching segments:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
