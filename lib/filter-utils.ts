/**
 * Shared filter logic for customer_profiles queries.
 * Used by both segments.ts (server actions) and page.tsx (server component).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface Condition {
  field: string
  operator: string
  value: any
  dateValue?: string
  dateTo?: string
  numDays?: number
  numValue?: number
}

export interface RuleGroup {
  matchType?: 'AND' | 'OR'
  conditions: Condition[]
  groups?: RuleGroup[]
}

export type RulesFormat = RuleGroup[] | Condition[] | { match_type: string; groups: RuleGroup[] }

// ---------------------------------------------------------------------------
// Normalize old flat array format to new nested format
// ---------------------------------------------------------------------------
export function normalizeRules(rules: any): { matchType: 'AND' | 'OR'; groups: RuleGroup[] } {
  if (!rules) return { matchType: 'AND', groups: [] }

  // Old flat array format: [{field, operator, value}]
  if (Array.isArray(rules) && rules.length > 0 && !rules[0].matchType && !rules[0].groups) {
    return {
      matchType: 'AND',
      groups: [{ matchType: 'AND', conditions: rules as Condition[] }]
    }
  }

  // Old { match_type, rules } format
  if ('match_type' in rules && 'rules' in rules && Array.isArray((rules as any).rules)) {
    return {
      matchType: (rules as any).match_type as 'AND' | 'OR',
      groups: [{ matchType: 'AND', conditions: (rules as any).rules as Condition[] }]
    }
  }

  // New nested format { match_type, groups }
  if ('groups' in rules && Array.isArray((rules as any).groups)) {
    return {
      matchType: ((rules as any).match_type as 'AND' | 'OR') || 'AND',
      groups: (rules as any).groups as RuleGroup[]
    }
  }

  return { matchType: 'AND', groups: [] }
}

// ---------------------------------------------------------------------------
// Build OR clause string for Supabase
// ---------------------------------------------------------------------------
function buildOrClause(field: string, op: string, value: any): string {
  if (op === '==') return `${field}.eq.${value}`
  if (op === '!=') return `${field}.neq.${value}`
  if (op === '>=') return `${field}.gte.${value}`
  if (op === '<=') return `${field}.lte.${value}`
  if (op === '>') return `${field}.gt.${value}`
  if (op === '<') return `${field}.lt.${value}`
  if (op === 'contains') return `${field}.ilike.%${encodeURIComponent(String(value))}%`
  if (op === 'is_empty') return `${field}.is.null`
  if (op === 'is_not_empty') return `${field}.not.is.null`
  return `${field}.eq.${value}`
}

// ---------------------------------------------------------------------------
// Apply a single condition to a query builder
// ---------------------------------------------------------------------------
export function applyCondition(qb: any, cond: Condition): any {
  const { field, operator, value, dateValue, dateTo, numDays } = cond

  // package_purchased — filter transactions JSONB
  if (field === 'package_purchased') {
    const packages = Array.isArray(value) ? value : [value]
    if (operator === 'has_bought') {
      packages.forEach(pkg => {
        qb = qb.filter('transactions', 'cs', JSON.stringify([{ package_name: pkg }]))
      })
    } else if (operator === 'not_bought') {
      packages.forEach(pkg => {
        qb = qb.not('transactions', 'cs', JSON.stringify([{ package_name: pkg }]))
      })
    }
    return qb
  }

  // module_used — filter module_usage JSONB
  if (field === 'module_used') {
    if (operator === 'is_any') return qb.neq('module_usage', '[]' as any)
    if (operator === 'is_empty') return qb.eq('module_usage', '[]' as any)
    if (operator === 'in') {
      const titles = Array.isArray(value) ? value : [value]
      titles.forEach(title => {
        qb = qb.filter('module_usage', 'cs', JSON.stringify([{ title }]))
      })
      return qb
    }
    // used_at_least: for MVP, skip this — requires complex JSONB array query
    // We'll handle it via client-side filtering in preview
    return qb
  }

  // Date fields (trial_expiry_date, last_expiry_date, conversion_date)
  const dateFields = ['trial_expiry_date', 'last_expiry_date', 'conversion_date']
  if (dateFields.includes(field)) {
    const now = new Date()
    if (operator === 'is_empty') return qb.is(field, null)
    if (operator === 'is_not_empty') return qb.not(field, 'is', null)
    if (operator === 'equals' && dateValue) return qb.eq(field, dateValue)
    if (operator === 'before' && dateValue) return qb.lt(field, dateValue)
    if (operator === 'after' && dateValue) return qb.gt(field, dateValue)
    if (operator === 'between' && dateValue && dateTo) return qb.gte(field, dateValue).lte(field, dateTo)
    if (operator === 'expires_within_days' && numDays) {
      const futureDate = new Date(now)
      futureDate.setDate(now.getDate() + numDays)
      return qb.gte(field, now.toISOString()).lte(field, futureDate.toISOString())
    }
    if (operator === 'already_expired') return qb.lt(field, now.toISOString())
    return qb
  }

  // Numeric operators
  if (operator === '>') return qb.gt(field, value)
  if (operator === '<') return qb.lt(field, value)

  // Standard operators
  switch (operator) {
    case '==': return qb.eq(field, value)
    case '!=': return qb.neq(field, value)
    case '>=': return qb.gte(field, value)
    case '<=': return qb.lte(field, value)
    case 'contains': return qb.ilike(field, `%${value}%`)
    case 'in': return qb.in(field, Array.isArray(value) ? value : [value])
    case 'is_empty': return qb.is(field, null)
    case 'is_not_empty': return qb.not(field, 'is', null)
    case 'is_zero': return qb.eq(field, 0)
    case 'is_not_zero': return qb.neq(field, 0)
    default: return qb
  }
}

// ---------------------------------------------------------------------------
// Apply all conditions in a group with AND logic (default)
// For OR logic, accumulate clauses and use .or()
// ---------------------------------------------------------------------------
function applyGroupAnd(qb: any, conditions: Condition[]): any {
  conditions.forEach(cond => {
    qb = applyCondition(qb, cond)
  })
  return qb
}

function buildGroupOrClauses(conditions: Condition[]): string[] {
  return conditions.map(cond => buildOrClause(cond.field, cond.operator, cond.value)).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Recursive filter builder — applies a RuleGroup to a query
// ---------------------------------------------------------------------------
export function applyGroupFilters(qb: any, group: RuleGroup): any {
  const matchType = group.matchType || 'AND'

  // Apply conditions
  if (group.conditions && group.conditions.length > 0) {
    if (matchType === 'AND') {
      qb = applyGroupAnd(qb, group.conditions)
    } else {
      // OR: build clauses and combine with .or()
      const clauses = buildGroupOrClauses(group.conditions)
      if (clauses.length > 0) {
        qb = qb.or(clauses.join(','))
      }
    }
  }

  // Recurse into nested groups
  if (group.groups && group.groups.length > 0) {
    group.groups.forEach(subGroup => {
      qb = applyGroupFilters(qb, subGroup)
    })
  }

  return qb
}

// ---------------------------------------------------------------------------
// Apply normalized rules (top-level groups = AND between groups)
// ---------------------------------------------------------------------------
export function applyFilters(qb: any, rules: { matchType: 'AND'; groups: RuleGroup[] }): any {
  rules.groups.forEach(group => {
    qb = applyGroupFilters(qb, group)
  })
  return qb
}