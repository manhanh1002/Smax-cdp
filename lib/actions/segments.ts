"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { normalizeRules, applyGroupFilters, type RulesFormat, type RuleGroup } from "@/lib/filter-utils"

export async function saveSegment(segment: {
  name: string
  description: string
  rules: RulesFormat
  matchType: 'AND' | 'OR'
}) {
  const supabase = await createClient()

  const normalized = normalizeRules(segment.rules)
  const rulesToSave = { match_type: normalized.matchType, groups: normalized.groups }

  const { data, error } = await supabase
    .from('dynamic_segments')
    .insert({
      name: segment.name,
      description: segment.description,
      rules: rulesToSave,
      match_type: segment.matchType
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving segment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/customers/segments')
  revalidatePath('/customers')

  return { success: true, data }
}

export async function updateSegment(id: string, updates: {
  name?: string
  description?: string
  rules?: RulesFormat
  matchType?: 'AND' | 'OR'
}) {
  const supabase = await createClient()

  const payload: any = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.matchType !== undefined) payload.match_type = updates.matchType

  if (updates.rules !== undefined) {
    const normalized = normalizeRules(updates.rules)
    payload.rules = { match_type: normalized.matchType, groups: normalized.groups }
  }

  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('dynamic_segments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating segment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/customers/segments')
  revalidatePath('/customers')

  return { success: true, data }
}

export async function deleteSegment(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dynamic_segments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting segment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/customers/segments')
  revalidatePath('/customers')

  return { success: true }
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

export async function previewSegment(rules: RulesFormat): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()

  const normalized = normalizeRules(rules)
  if (normalized.groups.length === 0) {
    const { count, error } = await supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true })

    if (error) return { count: 0, error: error.message }
    return { count: count || 0 }
  }

  let query = supabase.from('customer_profiles').select('*', { count: 'exact', head: true })
  normalized.groups.forEach((group: RuleGroup) => {
    query = applyGroupFilters(query, group)
  })

  const { count, error } = await query

  if (error) return { count: 0, error: error.message }
  return { count: count || 0 }
}

export async function countAllSegments(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data: segments, error } = await supabase
    .from('dynamic_segments')
    .select('id, rules, match_type')

  if (error || !segments) return {}

  const counts: Record<string, number> = {}

  for (const seg of segments) {
    const normalized = normalizeRules(seg.rules)
    if (normalized.groups.length === 0) {
      counts[seg.id] = 0
      continue
    }

    try {
      let query = supabase.from('customer_profiles').select('*', { count: 'exact', head: true })
      normalized.groups.forEach((group: RuleGroup) => {
        query = applyGroupFilters(query, group)
      })
      const { count } = await query
      counts[seg.id] = count || 0
    } catch {
      counts[seg.id] = -1
    }
  }

  return counts
}