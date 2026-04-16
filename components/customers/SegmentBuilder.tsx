"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Trash2, Save, Filter, Layers, Search, Loader2,
  ChevronDown, ChevronRight, Users, Edit3, AlertCircle
} from "lucide-react"
import { saveSegment, updateSegment, deleteSegment, previewSegment } from "@/lib/actions/segments"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Condition {
  id: string
  field: string
  operator: string
  value: any
  dateValue?: string
  dateTo?: string
  numDays?: number
}

interface RuleGroup {
  id: string
  matchType: 'AND' | 'OR'
  conditions: Condition[]
  nestedGroups?: RuleGroup[]
}

interface Segment {
  id?: string
  name: string
  description: string
  rules: any
  matchType: 'AND' | 'OR'
  created_at?: string
  customerCount?: number | null
}

// ---------------------------------------------------------------------------
// Field & Operator Definitions
// ---------------------------------------------------------------------------

const FIELD_META: Record<string, {
  type: 'numeric' | 'date' | 'enum' | 'text' | 'module' | 'package'
  label: string
  options?: { value: string; label: string }[]
}> = {
  current_plan: {
    type: 'enum', label: 'Gói hiện tại (Plan)',
    options: [{ value: 'PRO', label: 'PRO' }, { value: 'FREE', label: 'FREE' }]
  },
  biz_status: {
    type: 'enum', label: 'Trạng thái Trial',
    options: [
      { value: 'Trial', label: 'Đang dùng thử' },
      { value: 'Sắp hết trial', label: 'Sắp hết trial' },
      { value: 'Hết trial', label: 'Hết trial' },
      { value: 'Legacy', label: 'Legacy' }
    ]
  },
  total_revenue_vnd: { type: 'numeric', label: 'Tổng doanh thu (VND)' },
  total_visitors_all_time: { type: 'numeric', label: 'Tổng khách truy cập' },
  total_events_all_time: { type: 'numeric', label: 'Tổng số sự kiện (Events)' },
  transaction_count: { type: 'numeric', label: 'Số lần mua hàng' },
  marketing_source: { type: 'text', label: 'Nguồn Marketing' },
  marketing_campaign: { type: 'text', label: 'Chiến dịch Marketing' },
  module_used: { type: 'module', label: 'Tính năng đã dùng' },
  package_purchased: { type: 'package', label: 'Gói đã mua' },
  trial_expiry_date: { type: 'date', label: 'Ngày hết hạn dùng thử' },
  last_expiry_date: { type: 'date', label: 'Ngày hết hạn bản quyền' },
  conversion_date: { type: 'date', label: 'Ngày chuyển đổi (Free→Pro)' },
  biz_name: { type: 'text', label: 'Tên doanh nghiệp' },
  phone: { type: 'text', label: 'Số điện thoại' },
  email: { type: 'text', label: 'Email' },
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  numeric: [
    { value: '==', label: 'Bằng' },
    { value: '!=', label: 'Khác' },
    { value: '>=', label: 'Lớn hơn hoặc bằng' },
    { value: '<=', label: 'Nhỏ hơn hoặc bằng' },
    { value: '>', label: 'Lớn hơn' },
    { value: '<', label: 'Nhỏ hơn' },
    { value: 'is_empty', label: 'Trống' },
    { value: 'is_not_empty', label: 'Không trống' },
  ],
  enum: [
    { value: '==', label: 'Bằng' },
    { value: '!=', label: 'Khác' },
    { value: 'in', label: 'Là một trong' },
  ],
  text: [
    { value: '==', label: 'Bằng' },
    { value: '!=', label: 'Khác' },
    { value: 'contains', label: 'Chứa từ khóa' },
    { value: 'is_empty', label: 'Trống' },
    { value: 'is_not_empty', label: 'Không trống' },
  ],
  date: [
    { value: 'is_empty', label: 'Trống' },
    { value: 'is_not_empty', label: 'Không trống' },
    { value: 'equals', label: 'Bằng ngày' },
    { value: 'before', label: 'Trước ngày' },
    { value: 'after', label: 'Sau ngày' },
    { value: 'between', label: 'Trong khoảng' },
    { value: 'expires_within_days', label: 'Hết hạn trong (ngày)' },
    { value: 'already_expired', label: 'Đã hết hạn' },
  ],
  module: [
    { value: 'is_any', label: 'Đã dùng bất kỳ' },
    { value: 'is_empty', label: 'Chưa dùng gì' },
    { value: 'in', label: 'Đã dùng (chọn module)' },
    { value: 'used_at_least', label: 'Dùng từ (lần)' },
  ],
  package: [
    { value: 'has_bought', label: 'Đã mua' },
    { value: 'not_bought', label: 'Chưa mua' },
  ],
}

const getPackageOptions = (pkgs: string[]) =>
  pkgs.map(p => ({
    value: p,
    label: p === 'ZALO_ZNS' ? 'Zalo ZNS' : p === 'GEN_AI' ? 'Gen AI' : p
  }))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function createCondition(field = 'current_plan'): Condition {
  return { id: generateId(), field, operator: '==', value: '' }
}

function createGroup(isNested = false): RuleGroup {
  return {
    id: generateId(),
    matchType: isNested ? 'OR' : 'AND',
    conditions: [createCondition()],
    nestedGroups: [],
  }
}

// Convert segment old flat format to new nested format
function convertSegmentRules(rules: any): RuleGroup[] {
  if (!rules) return [createGroup()]

  // Already new format
  if ('groups' in rules && Array.isArray((rules as any).groups)) {
    return (rules as any).groups.map((g: any) => ({
      id: generateId(),
      matchType: (g.matchType || g.match_type || 'AND') as 'AND' | 'OR',
      conditions: (g.conditions || g.rules || []).map((c: any) => ({
        id: generateId(),
        field: c.field,
        operator: c.operator,
        value: c.value,
        dateValue: c.dateValue || c.date_value,
        dateTo: c.dateTo || c.date_to,
        numDays: c.numDays || c.num_days,
      })),
      nestedGroups: (g.groups || []).map((ng: any) => ({
        id: generateId(),
        matchType: (ng.matchType || ng.match_type || 'OR') as 'AND' | 'OR',
        conditions: (ng.conditions || ng.rules || []).map((c: any) => ({
          id: generateId(),
          field: c.field,
          operator: c.operator,
          value: c.value,
          dateValue: c.dateValue || c.date_value,
          dateTo: c.dateTo || c.date_to,
        })),
        nestedGroups: [],
      })),
    }))
  }

  // Old flat array format [{field, operator, value}]
  if (Array.isArray(rules) && rules.length > 0) {
    return [{
      id: generateId(),
      matchType: 'AND',
      conditions: rules.map((r: any) => ({
        id: generateId(),
        field: r.field,
        operator: r.operator,
        value: r.value,
      })),
      nestedGroups: [],
    }]
  }

  // Old {match_type, rules: []} format
  if ('match_type' in rules && 'rules' in rules && Array.isArray((rules as any).rules)) {
    return [{
      id: generateId(),
      matchType: (rules as any).match_type as 'AND' | 'OR',
      conditions: (rules as any).rules.map((r: any) => ({
        id: generateId(),
        field: r.field,
        operator: r.operator,
        value: r.value,
      })),
      nestedGroups: [],
    }]
  }

  return [createGroup()]
}

// Convert internal RuleGroup[] to API format
function groupsToApiFormat(groups: RuleGroup[]) {
  return {
    match_type: 'AND',
    groups: groups.map(g => ({
      matchType: g.matchType,
      conditions: g.conditions.map(({ id, ...c }) => c),
      groups: (g.nestedGroups || []).map(ng => ({
        matchType: ng.matchType,
        conditions: ng.conditions.map(({ id, ...c }) => c),
      })),
    }))
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchTypeToggle({ value, onChange }: { value: 'AND' | 'OR'; onChange: (v: 'AND' | 'OR') => void }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
      <button
        onClick={() => onChange('AND')}
        className={`px-3 py-1 rounded-md text-[10px] font-black tracking-wider transition-all ${
          value === 'AND'
            ? 'bg-zinc-900 text-white shadow-sm'
            : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >
        AND
      </button>
      <button
        onClick={() => onChange('OR')}
        className={`px-3 py-1 rounded-md text-[10px] font-black tracking-wider transition-all ${
          value === 'OR'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-zinc-500 hover:text-blue-600'
        }`}
      >
        OR
      </button>
    </div>
  )
}

function ConditionCard({
  condition,
  onUpdate,
  onRemove,
  canRemove,
  availableModules,
  availablePackages,
}: {
  condition: Condition
  onUpdate: (updated: Condition) => void
  onRemove: () => void
  canRemove: boolean
  availableModules: string[]
  availablePackages: string[]
}) {
  const [moduleSearch, setModuleSearch] = useState("")
  const meta = FIELD_META[condition.field] || FIELD_META['biz_name']
  const operators = OPERATORS_BY_TYPE[meta.type] || OPERATORS_BY_TYPE.text

  const needsValue = condition.operator !== 'is_empty' &&
    condition.operator !== 'is_not_empty' &&
    condition.operator !== 'already_expired'

  const handleFieldChange = (field: string | null) => {
    if (!field) return
    const newMeta = FIELD_META[field] || FIELD_META['biz_name']
    const newOperators = OPERATORS_BY_TYPE[newMeta.type] || OPERATORS_BY_TYPE.text
    let newOperator = newOperators[0].value
    let newValue: any = ''

    if (newMeta.type === 'enum' && newMeta.options) newValue = newMeta.options[0].value
    if (newMeta.type === 'package') newValue = []

    onUpdate({ ...condition, field, operator: newOperator, value: newValue })
  }

  const renderValueInput = () => {
    // No-value operators
    if (!needsValue) {
      return (
        <div className="flex-1 h-10 flex items-center px-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
          <span className="text-[10px] text-zinc-400 italic font-medium">—</span>
        </div>
      )
    }

    // Numeric
    if (meta.type === 'numeric' || condition.field === 'transaction_count') {
      return (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="number"
            value={condition.value}
            onChange={e => onUpdate({ ...condition, value: e.target.value })}
            placeholder="0"
            className="bg-white flex-1 min-w-0"
          />
        </div>
      )
    }

    // Date — single picker
    if (meta.type === 'date' && ['equals', 'before', 'after'].includes(condition.operator)) {
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="date"
            value={condition.dateValue || ''}
            onChange={e => onUpdate({ ...condition, dateValue: e.target.value })}
            className="flex-1 h-10 px-3 border border-zinc-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )
    }

    // Date — between
    if (meta.type === 'date' && condition.operator === 'between') {
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="date"
            value={condition.dateValue || ''}
            onChange={e => onUpdate({ ...condition, dateValue: e.target.value })}
            className="flex-1 h-10 px-3 border border-zinc-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-zinc-400 text-xs shrink-0">→</span>
          <input
            type="date"
            value={condition.dateTo || ''}
            onChange={e => onUpdate({ ...condition, dateTo: e.target.value })}
            className="flex-1 h-10 px-3 border border-zinc-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )
    }

    // Date — expires within days
    if (meta.type === 'date' && condition.operator === 'expires_within_days') {
      return (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="number"
            min="1"
            value={condition.numDays || condition.value || 30}
            onChange={e => onUpdate({ ...condition, numDays: parseInt(e.target.value) || 30, value: e.target.value })}
            placeholder="30"
            className="bg-white w-24"
          />
          <span className="text-xs text-zinc-400 font-medium shrink-0">ngày tới</span>
        </div>
      )
    }

    // Enum
    if (meta.type === 'enum') {
      const opts = meta.options || []
      const isMulti = condition.operator === 'in'
      if (isMulti) {
        const selected = Array.isArray(condition.value) ? condition.value : []
        return (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {opts.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  const next = selected.includes(opt.value)
                    ? selected.filter(v => v !== opt.value)
                    : [...selected, opt.value]
                  onUpdate({ ...condition, value: next })
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  selected.includes(opt.value)
                    ? 'bg-emerald-600 border-emerald-700 text-white'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )
      }
      return (
        <Select value={condition.value} onValueChange={v => onUpdate({ ...condition, value: v })}>
          <SelectTrigger className="flex-1 bg-white z-10">
            <SelectValue placeholder="Chọn..." />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {opts.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    }

    // Module
    if (meta.type === 'module') {
      const selected = Array.isArray(condition.value) ? condition.value : []
      const filtered = availableModules.filter(m =>
        m.toLowerCase().includes(moduleSearch.toLowerCase())
      )

      if (condition.operator === 'used_at_least') {
        return (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              min="1"
              value={condition.value}
              onChange={e => onUpdate({ ...condition, value: e.target.value })}
              placeholder="5"
              className="bg-white w-20"
            />
            <span className="text-xs text-zinc-400 font-medium">lần trở lên</span>
          </div>
        )
      }

      if (condition.operator === 'is_any' || condition.operator === 'is_empty') {
        return (
          <div className="flex-1 h-10 flex items-center px-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
            <span className="text-[10px] text-zinc-400 italic font-medium">—</span>
          </div>
        )
      }

      // Multi-select modules
      return (
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Selected badges */}
          <div className="flex flex-wrap gap-1 min-h-[40px] p-2 bg-white border border-zinc-200 rounded-xl">
            {selected.map(m => (
              <Badge key={m} variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 gap-1 pr-1 border-emerald-200 text-xs">
                {m}
                <button onClick={() => onUpdate({ ...condition, value: selected.filter(v => v !== m) })} className="hover:text-red-600 ml-0.5">✕</button>
              </Badge>
            ))}
            {selected.length === 0 && <span className="text-[10px] text-zinc-400 italic p-0.5">Chọn module...</span>}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-zinc-400" />
            <Input
              placeholder="Tìm module..."
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white rounded-lg border-zinc-200"
            />
          </div>
          {/* Module list */}
          <div className="max-h-32 overflow-y-auto border border-zinc-100 rounded-lg p-2 bg-white flex flex-wrap gap-1">
            {filtered.map(m => (
              <button
                key={m}
                onClick={() => {
                  const next = selected.includes(m)
                    ? selected.filter(v => v !== m)
                    : [...selected, m]
                  onUpdate({ ...condition, value: next })
                }}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  selected.includes(m)
                    ? 'bg-emerald-600 border-emerald-700 text-white font-bold'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Package
    if (meta.type === 'package') {
      const selected = Array.isArray(condition.value) ? condition.value : [condition.value]
      const pkgOpts = getPackageOptions(availablePackages)
      return (
        <div className="flex flex-wrap gap-1.5 flex-1">
          {pkgOpts.map((opt: { value: string; label: string }) => (
            <button
              key={opt.value}
              onClick={() => {
                if (condition.operator === 'not_bought') {
                  onUpdate({ ...condition, value: opt.value })
                } else {
                  const next = selected.includes(opt.value)
                    ? selected.filter(v => v !== opt.value)
                    : [...selected, opt.value]
                  onUpdate({ ...condition, value: next })
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                (condition.operator === 'not_bought' ? [condition.value] : selected).includes(opt.value)
                  ? 'bg-violet-600 border-violet-700 text-white'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    // Text default
    return (
      <Input
        value={condition.value}
        onChange={e => onUpdate({ ...condition, value: e.target.value })}
        placeholder="Nhập giá trị..."
        className="flex-1 bg-white"
      />
    )
  }

  return (
    <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 rounded-xl bg-white border border-zinc-100 hover:border-zinc-200 transition-all">
      {/* Field selector */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-full lg:w-[220px] bg-zinc-50 border-zinc-200 font-semibold text-zinc-700 z-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          {Object.entries(FIELD_META).map(([key, meta]) => (
            <SelectItem key={key} value={key} className="font-medium">
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.operator}
        onValueChange={v => {
          if (!v) return
          let newVal: any = condition.value
          if (v === 'in' && meta.type === 'enum' && meta.options) newVal = [meta.options[0].value]
          if (v === 'in' && meta.type === 'module') newVal = []
          onUpdate({ ...condition, operator: v, value: newVal })
        }}
      >
        <SelectTrigger className="w-full lg:w-[180px] bg-zinc-50 border-zinc-200 font-medium text-blue-600 z-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          {operators.map(op => (
            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      <div className="flex-1 w-full">{renderValueInput()}</div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-zinc-300 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-full lg:relative lg:top-auto"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

function NestedGroupCard({
  group,
  onUpdate,
  onRemove,
  availableModules,
  availablePackages,
  depth = 1,
}: {
  group: RuleGroup
  onUpdate: (updated: RuleGroup) => void
  onRemove?: () => void
  availableModules: string[]
  availablePackages: string[]
  depth?: number
}) {
  const [collapsed, setCollapsed] = useState(false)

  const depthColor = depth === 1
    ? 'border-blue-200 bg-blue-50/50'
    : 'border-amber-200 bg-amber-50/50'

  const headerColor = depth === 1 ? 'bg-blue-600' : 'bg-amber-600'

  return (
    <div className={`rounded-xl border ${depthColor} overflow-hidden`}>
      {/* Group header */}
      <div className={`${headerColor} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {collapsed ? (
            <ChevronRight className="size-4 text-white/70 cursor-pointer" onClick={() => setCollapsed(false)} />
          ) : (
            <ChevronDown className="size-4 text-white/70 cursor-pointer" onClick={() => setCollapsed(true)} />
          )}
          <span className="text-xs font-black text-white uppercase tracking-wider">
            {depth === 1 ? 'Nhóm con (Nested)' : 'Nhóm con'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MatchTypeToggle
            value={group.matchType}
            onChange={mt => onUpdate({ ...group, matchType: mt })}
          />
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg h-7 w-7"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Conditions in this nested group */}
          {group.conditions.map((cond, idx) => (
            <div key={cond.id} className="relative">
              {idx > 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className={`text-[9px] font-black px-2 ${group.matchType === 'OR' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-800 text-white'}`}>
                    {group.matchType}
                  </Badge>
                </div>
              )}
              <ConditionCard
                condition={cond}
                onUpdate={updated => {
                  const next = [...group.conditions]
                  next[idx] = updated
                  onUpdate({ ...group, conditions: next })
                }}
                onRemove={() => onUpdate({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) })}
                canRemove={group.conditions.length > 1}
                availableModules={availableModules}
                availablePackages={availablePackages}
              />
            </div>
          ))}

          {/* Add condition in nested group */}
          <Button
            variant="outline"
            onClick={() => onUpdate({ ...group, conditions: [...group.conditions, createCondition()] })}
            className="w-full h-9 rounded-xl border-dashed border-zinc-300 text-zinc-500 font-bold hover:bg-zinc-50 hover:text-zinc-700 text-xs"
          >
            <Plus className="size-3.5 mr-1.5" /> Thêm điều kiện
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SegmentBuilder({
  initialSegments = [],
  availableModules = [],
  availablePackages = ['PRO', 'ZALO_ZNS', 'GEN_AI'],
}: {
  initialSegments: Segment[]
  availableModules: string[]
  availablePackages?: string[]
}) {
  // Segment list (local state, refreshed on save/update/delete)
  const [segments, setSegments] = useState<Segment[]>(initialSegments)

  // Current builder state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [groups, setGroups] = useState<RuleGroup[]>([createGroup()])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Preview
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load segment for editing
  const loadSegment = useCallback((seg: Segment) => {
    setEditingId(seg.id || null)
    setName(seg.name)
    setDescription(seg.description || '')
    setGroups(convertSegmentRules(seg.rules))
    setPreviewCount(seg.customerCount ?? null)
  }, [])

  // Reset builder
  const resetBuilder = useCallback(() => {
    setEditingId(null)
    setName("")
    setDescription("")
    setGroups([createGroup()])
    setPreviewCount(null)
    setPreviewError(null)
  }, [])

  // Debounced preview
  const triggerPreview = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      const apiFormat = groupsToApiFormat(groups)
      const result = await previewSegment(apiFormat)
      if (result.error) {
        setPreviewError(result.error)
        setPreviewCount(null)
      } else {
        setPreviewCount(result.count)
      }
      setPreviewLoading(false)
    }, 500)
  }, [groups])

  useEffect(() => {
    triggerPreview()
  }, [triggerPreview])

  // Save / Update
  const handleSave = async () => {
    if (!name.trim() || groups.length === 0) return
    setIsSaving(true)

    const apiFormat = groupsToApiFormat(groups)
    const payload = { name, description, rules: apiFormat, matchType: 'AND' as const }

    let result: any
    if (editingId) {
      result = await updateSegment(editingId, payload)
    } else {
      result = await saveSegment(payload)
    }

    if (result.success && result.data) {
      if (editingId) {
        setSegments(prev => prev.map(s => s.id === editingId ? { ...s, ...result.data, customerCount: previewCount } : s))
      } else {
        setSegments(prev => [{ ...result.data, customerCount: previewCount }, ...prev])
      }
      resetBuilder()
    } else {
      alert("Lỗi: " + (result.error || "Không rõ nguyên nhân"))
    }
    setIsSaving(false)
  }

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Xóa phân khúc này?")) return
    setIsDeleting(true)
    const result = await deleteSegment(id)
    if (result.success) {
      setSegments(prev => prev.filter(s => s.id !== id))
      if (editingId === id) resetBuilder()
    } else {
      alert("Lỗi xóa: " + (result.error || ""))
    }
    setIsDeleting(false)
  }

  // Update a top-level group
  const updateGroup = (idx: number, updated: RuleGroup) => {
    setGroups(prev => prev.map((g, i) => i === idx ? updated : g))
  }

  // Add top-level group
  const addGroup = () => {
    setGroups(prev => [...prev, createGroup(true)])
  }

  // Remove top-level group
  const removeGroup = (idx: number) => {
    setGroups(prev => prev.filter((_, i) => i !== idx))
  }

  // Add nested group to a top-level group
  const addNestedGroup = (idx: number) => {
    setGroups(prev => prev.map((g, i) =>
      i === idx ? { ...g, nestedGroups: [...(g.nestedGroups || []), createGroup(true)] } : g
    ))
  }

  // Update nested group
  const updateNestedGroup = (gIdx: number, ngIdx: number, updated: RuleGroup) => {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx
        ? { ...g, nestedGroups: (g.nestedGroups || []).map((ng, ni) => ni === ngIdx ? updated : ng) }
        : g
    ))
  }

  // Remove nested group
  const removeNestedGroup = (gIdx: number, ngIdx: number) => {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx
        ? { ...g, nestedGroups: (g.nestedGroups || []).filter((_, ni) => ni !== ngIdx) }
        : g
    ))
  }

  // Render condition rows inside a group
  const renderGroupConditions = (group: RuleGroup, gIdx: number) => {
    return (
      <div className="space-y-3">
        {group.conditions.map((cond, idx) => (
          <div key={cond.id} className="relative">
            {/* AND/OR label between conditions */}
            {idx > 0 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <Badge className={`text-[9px] font-black px-2 shadow-sm ${
                  group.matchType === 'OR'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-zinc-800 text-white border border-zinc-700'
                }`}>
                  {group.matchType}
                </Badge>
              </div>
            )}
            <ConditionCard
              condition={cond}
              onUpdate={updated => {
                const next = [...group.conditions]
                next[idx] = updated
                updateGroup(gIdx, { ...group, conditions: next })
              }}
              onRemove={() => updateGroup(gIdx, { ...group, conditions: group.conditions.filter((_, i) => i !== idx) })}
              canRemove={group.conditions.length > 1}
              availableModules={availableModules}
              availablePackages={availablePackages}
            />
          </div>
        ))}

        {/* Nested groups */}
        {(group.nestedGroups || []).map((ng, ngIdx) => (
          <NestedGroupCard
            key={ng.id}
            group={ng}
            onUpdate={updated => updateNestedGroup(gIdx, ngIdx, updated)}
            onRemove={() => removeNestedGroup(gIdx, ngIdx)}
            availableModules={availableModules}
            availablePackages={availablePackages}
            depth={2}
          />
        ))}

        {/* Add nested group button (max depth 1) */}
        {(!group.nestedGroups || group.nestedGroups.length < 1) && (
          <Button
            variant="outline"
            onClick={() => addNestedGroup(gIdx)}
            className="w-full h-8 rounded-xl border-dashed border-blue-200 text-blue-500 font-bold hover:bg-blue-50 hover:text-blue-700 text-[10px]"
          >
            <Plus className="size-3 mr-1" /> Thêm nhóm con (AND/OR)
          </Button>
        )}
      </div>
    )
  }

  // Format rule summary for segment list
  const formatRuleSummary = (seg: Segment) => {
    try {
      const groups = convertSegmentRules(seg.rules)
      const summaries: string[] = []
      groups.forEach(g => {
        g.conditions.forEach(c => {
          const fieldMeta = FIELD_META[c.field]
          const fieldLabel = fieldMeta?.label || c.field
          if (c.operator === 'is_any') summaries.push(`${fieldLabel} = Có`)
          else if (c.operator === 'is_empty') summaries.push(`${fieldLabel} = Trống`)
          else if (c.operator === 'expires_within_days') summaries.push(`${fieldLabel} ≤ ${c.numDays || c.value} ngày`)
          else if (c.operator === 'already_expired') summaries.push(`${fieldLabel} = Đã hết`)
          else if (c.operator === 'is_zero') summaries.push(`${fieldLabel} = 0`)
          else if (Array.isArray(c.value) && c.value.length > 0) summaries.push(`${fieldLabel}: ${c.value.join(', ')}`)
          else if (c.value) summaries.push(`${fieldLabel} ${c.operator} ${c.value}`)
        })
      })
      return summaries.slice(0, 3).join(' • ')
    } catch {
      return ''
    }
  }

  const totalConditions = groups.reduce((sum, g) => sum + g.conditions.length, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT — Rule Builder */}
      <Card className="lg:col-span-2 shadow-sm border-zinc-200 rounded-2xl bg-white">
        {/* Header */}
        <div className="bg-zinc-900 p-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="size-4 text-emerald-400" />
              {editingId ? 'Chỉnh sửa phân khúc' : 'Tạo phân khúc mới'}
            </h2>
            <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest font-bold">
              {editingId ? 'Cập nhật quy tắc lọc' : 'Xây dựng bộ lọc khách hàng mục tiêu'}
            </p>
          </div>
          {editingId && (
            <Button
              variant="ghost"
              onClick={resetBuilder}
              className="text-zinc-400 hover:text-white text-xs font-bold"
            >
              + Tạo mới
            </Button>
          )}
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tên phân khúc</label>
              <Input
                placeholder="VD: Khách sắp hết hạn PRO"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-zinc-50 border-zinc-200 rounded-xl font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mô tả / Chiến lược</label>
              <Input
                placeholder="VD: Chiến dịch reminder 7 ngày trước hết hạn"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-zinc-50 border-zinc-200 rounded-xl"
              />
            </div>
          </div>

          {/* Root AND/OR */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Điều kiện:</span>
            <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50">
              KHỚP TẤT CẢ ({groups.length}) NHÓM (AND)
            </Badge>
            <Button variant="outline" size="sm" onClick={addGroup} className="h-7 rounded-lg text-[10px] font-black ml-auto border-emerald-200 text-emerald-600 hover:bg-emerald-50">
              <Plus className="size-3 mr-1" /> Thêm nhóm
            </Button>
          </div>

          {/* Groups */}
          <div className="space-y-6">
            {groups.map((group, gIdx) => (
              <div key={group.id} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <MatchTypeToggle
                      value={group.matchType}
                      onChange={mt => updateGroup(gIdx, { ...group, matchType: mt })}
                    />
                    {groups.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGroup(gIdx)}
                        className="text-zinc-300 hover:text-red-500 rounded-full h-7 w-7"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  {groups.length > 1 && (
                    <div className="h-px flex-1 bg-zinc-100" />
                  )}
                </div>

                {/* Conditions */}
                {renderGroupConditions(group, gIdx)}

                {/* Add condition */}
                <Button
                  variant="outline"
                  onClick={() => updateGroup(gIdx, { ...group, conditions: [...group.conditions, createCondition()] })}
                  className="w-full h-10 rounded-xl border-dashed border-zinc-300 text-zinc-500 font-bold hover:bg-zinc-50 hover:text-emerald-600 hover:border-emerald-300 text-xs"
                >
                  <Plus className="size-4 mr-1.5" /> Thêm điều kiện
                </Button>

                {/* Group divider */}
                {gIdx < groups.length - 1 && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-zinc-200" />
                    <Badge className="text-[9px] font-black bg-zinc-900 text-white px-2">AND giữa các nhóm</Badge>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview + Save */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            {/* Preview */}
            <div className="flex items-center gap-2">
              <Users className="size-4 text-zinc-400" />
              {previewLoading ? (
                <Loader2 className="size-4 animate-spin text-zinc-400" />
              ) : previewError ? (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="size-3" /> Lỗi preview
                </span>
              ) : previewCount !== null ? (
                <span className="text-sm font-black text-emerald-600">
                  {previewCount.toLocaleString('vi-VN')} khách hàng khớp
                </span>
              ) : (
                <span className="text-xs text-zinc-400 italic">Đang tính...</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => handleDelete(editingId)}
                  disabled={isDeleting}
                  className="border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-xl px-4 h-11 text-xs"
                >
                  <Trash2 className="size-4 mr-1.5" />
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!name.trim() || isSaving || totalConditions === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xl shadow-emerald-900/20 px-6 h-11 font-black tracking-wide text-xs"
              >
                {isSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                {isSaving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu phân khúc'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT — Segment List */}
      <Card className="shadow-sm border-zinc-200 rounded-2xl bg-zinc-50/50 h-fit">
        <div className="p-5 border-b border-zinc-100 bg-white rounded-t-2xl">
          <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
            <Filter className="size-4 text-emerald-500" />
            Danh sách phân khúc
          </h3>
          <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">{segments.length} phân khúc đã lưu</p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 max-h-[700px] overflow-y-auto">
            {segments.length > 0 ? segments.map(seg => (
              <div
                key={seg.id}
                onClick={() => loadSegment(seg)}
                className={`p-5 hover:bg-white transition-all cursor-pointer border-l-4 ${
                  editingId === seg.id
                    ? 'border-l-emerald-500 bg-white'
                    : 'border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-black text-zinc-900 text-sm leading-tight">{seg.name}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Customer count badge */}
                    {seg.customerCount !== undefined && seg.customerCount !== null && seg.customerCount >= 0 && (
                      <Badge className="text-[9px] font-black bg-zinc-900 text-white">
                        {seg.customerCount.toLocaleString('vi-VN')} khách
                      </Badge>
                    )}
                    {seg.customerCount === -1 && (
                      <Badge className="text-[9px] font-black bg-zinc-200 text-zinc-500">—</Badge>
                    )}
                    <Edit3 className="size-3 text-zinc-300" />
                  </div>
                </div>
                {seg.description && (
                  <div className="text-xs text-zinc-500 leading-relaxed mb-2">{seg.description}</div>
                )}
                <div className="text-[10px] text-zinc-400 leading-relaxed mb-2 font-medium">
                  {formatRuleSummary(seg) || 'Không có quy tắc'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-[9px] font-black ${
                    (seg.matchType || 'AND') === 'OR'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-zinc-900 text-zinc-100'
                  }`}>
                    {seg.matchType || 'AND'}
                  </Badge>
                  {seg.rules?.groups?.length > 1 && (
                    <Badge className="text-[9px] font-black bg-zinc-100 text-zinc-600">
                      {seg.rules.groups.length} nhóm
                    </Badge>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-12 text-center">
                <div className="text-zinc-300 text-3xl mb-3">📋</div>
                <div className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-relaxed">
                  Chưa có phân khúc nào.<br />Tạo phân khúc đầu tiên bên trái.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}