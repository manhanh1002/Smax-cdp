"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, Filter, Layers, Check, X, Search, Loader2 } from "lucide-react"
import { saveSegment } from "@/lib/actions/segments"

interface Rule {
  field: string
  operator: string
  value: any 
}

interface Segment {
  id?: string
  name: string
  description: string
  rules: Rule[]
  matchType: 'AND' | 'OR'
  created_at?: string
}

const FIELDS = [
  { id: "current_plan", label: "Gói hiện tại" },
  { id: "biz_status", label: "Trạng thái Trial" },
  { id: "total_revenue_vnd", label: "Tổng doanh thu (VND)" },
  { id: "total_visitors_all_time", label: "Tổng khách truy cập" },
  { id: "marketing_source", label: "Nguồn Marketing" },
  { id: "module_used", label: "Tính năng đã dùng" },
  { id: "trial_expiry_date", label: "Ngày hết hạn dùng thử (FREE)" },
  { id: "last_expiry_date", label: "Ngày hết hạn bản quyền (PRO)" },
  { id: "conversion_date", label: "Ngày chuyển đổi (Free->Pro)" },
]

const OPERATORS = [
  { id: "==", label: "Bằng" },
  { id: "!=", label: "Khác" },
  { id: ">=", label: "Lớn hơn hoặc bằng" },
  { id: "<=", label: "Nhỏ hơn hoặc bằng" },
  { id: "contains", label: "Chứa từ khóa" },
  { id: "in", label: "Là một trong số" },
  { id: "is_any", label: "Có hoạt động (Bất kỳ)" },
  { id: "is_empty", label: "Không có dữ liệu (Null)" },
  { id: "within_last", label: "Trong vòng (ngày)" },
  { id: "older_than", label: "Trước đó hơn (ngày)" },
]

export default function SegmentBuilder({ initialSegments, availableModules = [] }: { initialSegments: Segment[], availableModules: string[] }) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments || [])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [matchType, setMatchType] = useState<'AND' | 'OR'>( 'AND')
  const [rules, setRules] = useState<Rule[]>([{ field: "current_plan", operator: "==", value: "" }])
  const [isSaving, setIsSaving] = useState(false)
  const [moduleSearch, setModuleSearch] = useState("")

  const addRule = () => {
    setRules([...rules, { field: "current_plan", operator: "==", value: "" }])
  }

  const updateRule = (index: number, key: keyof Rule, val: any) => {
    const newRules = [...rules]
    if (key === 'field') {
      if (val === 'module_used') {
        newRules[index].operator = 'in'
        newRules[index].value = []
      } else if (val.includes('date')) {
        newRules[index].operator = 'within_last'
        newRules[index].value = "30"
      } else {
        newRules[index].operator = '=='
        newRules[index].value = ""
      }
    }
    newRules[index][key] = val
    setRules(newRules)
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const toggleModule = (index: number, moduleName: string) => {
    const currentValues = Array.isArray(rules[index].value) ? rules[index].value : []
    const newValues = currentValues.includes(moduleName)
      ? currentValues.filter(v => v !== moduleName)
      : [...currentValues, moduleName]
    updateRule(index, "value", newValues)
  }

  const handleSaveSegment = async () => {
    if (!name || rules.length === 0) return
    setIsSaving(true)
    
    const newSegment = { name, description, rules, matchType }
    const result = await saveSegment(newSegment)

    if (result.success && result.data) {
      setSegments([result.data[0], ...segments])
      setName("")
      setDescription("")
      setMatchType('AND')
      setRules([{ field: "current_plan", operator: "==", value: "" }])
    } else {
      alert("Error saving segment: " + (result.error || "Unknown error"))
    }
    setIsSaving(false)
  }

  const renderValueInput = (rule: Rule, index: number) => {
    if (rule.operator === 'is_any' || rule.operator === 'is_empty') {
      return (
        <div className="flex-1 bg-zinc-100/50 rounded-xl h-10 flex items-center px-4 border border-dashed border-zinc-200">
           <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Không cần nhập giá trị</span>
        </div>
      )
    }

    if (rule.field === 'module_used') {
      const selected = Array.isArray(rule.value) ? rule.value : []
      const filteredModules = availableModules.filter(m => 
        m.toLowerCase().includes(moduleSearch.toLowerCase())
      )

      return (
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-white border border-zinc-200 rounded-xl min-h-[40px]">
            {selected.map(m => (
              <Badge key={m} variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 gap-1 pr-1 border-emerald-200">
                {m}
                <X className="size-3 cursor-pointer" onClick={() => toggleModule(index, m)} />
              </Badge>
            ))}
            {selected.length === 0 && <span className="text-[10px] text-zinc-400 italic p-1">Các tính năng đã chọn sẽ hiện ở đây...</span>}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-zinc-400" />
            <Input 
              placeholder="Tìm & chọn tính năng..." 
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white rounded-lg border-zinc-200"
            />
          </div>

          <div className="max-h-32 overflow-y-auto border border-zinc-100 rounded-lg p-2 bg-white flex flex-wrap gap-1">
            {filteredModules.map(m => (
              <button
                key={m}
                onClick={() => toggleModule(index, m)}
                className={`text-[10px] px-2 py-1 rounded-md transition-colors border ${
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

    if (rule.field === 'current_plan') {
      return (
        <Select value={rule.value} onValueChange={v => updateRule(index, "value", v)}>
          <SelectTrigger className="flex-1 bg-white z-10 w-full">
            <SelectValue placeholder="Chọn gói" />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (rule.field === 'biz_status') {
      return (
        <Select value={rule.value} onValueChange={v => updateRule(index, "value", v)}>
          <SelectTrigger className="flex-1 bg-white z-10 w-full">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            <SelectItem value="Trial">Dùng thử (Trial)</SelectItem>
            <SelectItem value="Sắp hết trial">Sắp hết trial</SelectItem>
            <SelectItem value="Hết trial">Hết trial</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (rule.field.includes('date')) {
      return (
        <div className="flex items-center gap-2 flex-1">
          <Input 
            type="number"
            value={rule.value} 
            onChange={e => updateRule(index, "value", e.target.value)} 
            placeholder="Số ngày..."
            className="bg-white"
          />
          <span className="text-xs font-bold text-zinc-400">NGÀY</span>
        </div>
      )
    }

    return (
      <Input 
        value={rule.value} 
        onChange={e => updateRule(index, "value", e.target.value)} 
        placeholder="Giá trị..."
        className="flex-1 bg-white"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-2 shadow-sm border-zinc-200 rounded-2xl bg-white relative">
        <div className="bg-zinc-900 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="size-5 text-emerald-400" /> Thiết lập phân khúc
            </h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">Xây dựng bộ lọc khách hàng mục tiêu chính xác</p>
          </div>
          <div className="bg-zinc-800 p-1 rounded-xl flex gap-1 border border-zinc-700">
            <Button variant={matchType === 'AND' ? "default" : "ghost"} size="sm" onClick={() => setMatchType('AND')} className={`rounded-lg text-[10px] h-7 font-black ${matchType === 'AND' ? 'bg-emerald-600' : 'text-zinc-400'}`}>AND</Button>
            <Button variant={matchType === 'OR' ? "default" : "ghost"} size="sm" onClick={() => setMatchType('OR')} className={`rounded-lg text-[10px] h-7 font-black ${matchType === 'OR' ? 'bg-emerald-600' : 'text-zinc-400'}`}>OR</Button>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tên phân khúc</label>
              <Input placeholder="VD: Khách hàng sắp hết hạn / High Intent" value={name} onChange={e => setName(e.target.value)} className="bg-zinc-50 border-zinc-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mô tả / Chiến lược</label>
              <Input placeholder="Mô tả mục tiêu của tệp khách hàng này" value={description} onChange={e => setDescription(e.target.value)} className="bg-zinc-50 border-zinc-200 rounded-xl" />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em]">Điều kiện lọc</label>
              <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-100 bg-blue-50">KHỚP {matchType === 'AND' ? 'TẤT CẢ' : 'MỘT TRONG'} CÁC ĐIỀU KIỆN</Badge>
            </div>
            
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={idx} className="group relative flex flex-col gap-3 p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all">
                  <div className="absolute -left-2 top-12 lg:top-1/2 -translate-y-1/2 bg-white text-zinc-900 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-zinc-200 z-20 pointer-events-none">{idx === 0 ? "START" : matchType}</div>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 relative z-10">
                    <Select value={rule.field} onValueChange={v => updateRule(idx, "field", v)}>
                      <SelectTrigger className="w-full lg:w-[240px] bg-white border-zinc-200 shadow-sm font-bold text-zinc-700 z-10"><SelectValue placeholder="Trường dữ liệu" /></SelectTrigger>
                      <SelectContent className="z-[100]">{FIELDS.map(f => <SelectItem key={f.id} value={f.id} className="font-medium">{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={v => updateRule(idx, "operator", v)}>
                      <SelectTrigger className="w-full lg:w-[180px] bg-white border-zinc-200 shadow-sm font-medium text-blue-600 z-10"><SelectValue placeholder="Toán tử" /></SelectTrigger>
                      <SelectContent className="z-[100]">{OPERATORS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex-1 w-full flex items-center gap-2">{renderValueInput(rule, idx)}</div>
                    <Button variant="ghost" size="icon" onClick={() => removeRule(idx)} disabled={rules.length === 1} className="text-zinc-300 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-full"><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addRule} className="w-full h-12 rounded-xl border-dashed border-zinc-300 text-zinc-500 font-bold hover:bg-zinc-50 hover:text-emerald-600 hover:border-emerald-300 transition-all"><Plus className="size-4 mr-2" /> Thêm điều kiện mới</Button>
          </div>
          <div className="pt-6 flex justify-end">
            <Button onClick={handleSaveSegment} disabled={!name || isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xl shadow-emerald-900/20 px-10 h-12 font-black tracking-wide">
              {isSaving ? <Loader2 className="size-5 mr-2 animate-spin" /> : <Save className="size-5 mr-2" />}
              {isSaving ? "Đang lưu..." : "Lưu phân khúc"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-zinc-200 rounded-2xl bg-zinc-50/50 h-fit">
        <div className="p-6 border-b border-zinc-100 bg-white rounded-t-2xl">
          <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2"><Filter className="size-4 text-emerald-500" /> Danh sách phân khúc</h3>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 max-h-[700px] overflow-y-auto">
            {segments.length > 0 ? segments.map((seg, idx) => (
              <div key={idx} className="p-6 hover:bg-white transition-all group cursor-pointer border-l-4 border-l-transparent hover:border-l-emerald-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-zinc-900 text-sm tracking-tight">{seg.name}</div>
                  <Badge className={`text-[9px] font-black ${seg.matchType === 'OR' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-900 text-zinc-100'}`}>{seg.matchType}</Badge>
                </div>
                {seg.description && <div className="text-xs text-zinc-500 leading-relaxed font-medium">{seg.description}</div>}
                <div className="mt-4 flex flex-wrap gap-1.5">{seg.rules.map((rule, rIdx) => (<Badge key={rIdx} variant="secondary" className="text-[9px] bg-white border border-zinc-100 text-zinc-600 font-bold px-2">{rule.field} {rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}</Badge>))}</div>
              </div>
            )) : (<div className="p-12 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest leading-loose">Chưa có phân khúc nào.<br/>Bắt đầu tạo phân khúc đầu tiên.</div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
