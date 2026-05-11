'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurriculum, useProgrammes, useTrainers } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { CurriculumUnit } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import {
  BookOpen, Users, Pencil, Trash2, Loader2, Plus,
  Download, Upload, X, CheckCircle, AlertCircle, Check,
} from 'lucide-react'
import TrainerPanel from '@/components/features/curriculum/TrainerPanel'

const BLANK = {
  code: '',
  name: '',
  term_number: 1,
  periods_per_week: 2,
  credit_hours: 2,
  unit_type: 'CORE',
  notes: '',
  is_outsourced: false,
}

const UNIT_TYPES = ['CORE', 'ELECTIVE', 'PRACTICAL', 'PROJECT']

const UNIT_TYPE_STYLE: Record<string, string> = {
  CORE:      'bg-blue-50 text-blue-700 ring-blue-200',
  ELECTIVE:  'bg-violet-50 text-violet-700 ring-violet-200',
  PRACTICAL: 'bg-teal-50 text-teal-700 ring-teal-200',
  PROJECT:   'bg-amber-50 text-amber-700 ring-amber-200',
}

const TERM_COLORS = [
  'bg-blue-50 text-blue-700 ring-blue-200',
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-teal-50 text-teal-700 ring-teal-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-amber-50 text-amber-700 ring-amber-200',
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
  'bg-orange-50 text-orange-700 ring-orange-200',
]

interface ImportResult {
  programme: string
  created: number
  updated: number
  skipped: number
  errors: { row: number; code: string; error: string }[]
}

// ── Inline row state ──────────────────────────────────────────────────────────
interface InlineRow {
  termNumber: number
  code: string
  name: string
  unit_type: string
  periods_per_week: number
  credit_hours: number
  is_outsourced: boolean
}

const BLANK_INLINE = (termNumber: number): InlineRow => ({
  termNumber,
  code: '',
  name: '',
  unit_type: 'CORE',
  periods_per_week: 1,
  credit_hours: 2,
  is_outsourced: false,
})

export default function CurriculumPage() {
  const qc = useQueryClient()
  const { data: programmes = [] } = useProgrammes()
  const { data: trainers = [] }   = useTrainers()

  const [progId,  setProgId]  = useState('')
  const [termNum, setTermNum] = useState<number | undefined>(undefined)
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<CurriculumUnit | null>(null)
  const [form,    setForm]    = useState({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)
  const [trainerUnit, setTrainerUnit] = useState<CurriculumUnit | null>(null)

  // Inline row state — keyed by term number, null = no inline row open for that term
  const [inlineRow, setInlineRow]     = useState<InlineRow | null>(null)
  const [inlineSaving, setInlineSaving] = useState(false)
  const inlineCodeRef = useRef<HTMLInputElement>(null)

  // Import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImportResult, setShowImportResult] = useState(false)

  const { data: units = [], isLoading } = useCurriculum(progId, termNum)

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.curriculum(progId, termNum) })

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setOpen(true) }
  function openEdit(u: CurriculumUnit) {
    setEditing(u)
    setForm({
      code:             u.code ?? '',
      name:             u.name ?? '',
      term_number:      u.term_number ?? 1,
      periods_per_week: u.periods_per_week ?? 2,
      credit_hours:     u.credit_hours ?? 2,
      unit_type:        u.unit_type ?? 'CORE',
      notes:            u.notes ?? '',
      is_outsourced:    u.is_outsourced ?? false,
    })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditing(null); setForm({ ...BLANK }) }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, programme: progId }
      return editing
        ? api.put(`/curriculum/${editing.id}/`, payload).then(r => r.data)
        : api.post('/curriculum/', payload).then(r => r.data)
    },
    onSuccess: res => {
      if (res.ok) { toast.success(editing ? 'Unit updated' : 'Unit created'); invalidate(); closeModal() }
      else toast.error(res.error ?? 'Failed')
    },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/curriculum/${id}/`).then(r => r.data),
    onSuccess: (res, id) => {
      if (res.ok) { toast.success('Unit deleted'); invalidate() }
      else toast.error(res.error ?? 'Failed')
      if (delId === id) setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(u: CurriculumUnit) {
    if (!confirm(`Delete unit "${u.name}"? This cannot be undone.`)) return
    setDelId(u.id)
    delMutation.mutate(u.id)
  }

  // ── Inline row handlers ───────────────────────────────────────────────────
  function openInlineRow(termNumber: number) {
    setInlineRow(BLANK_INLINE(termNumber))
    setTimeout(() => inlineCodeRef.current?.focus(), 50)
  }

  function closeInlineRow() {
    setInlineRow(null)
  }

  async function saveInlineRow() {
    if (!inlineRow || !inlineRow.code.trim() || !inlineRow.name.trim()) {
      toast.error('Code and Name are required')
      return
    }
    setInlineSaving(true)
    try {
      const payload = {
        code:             inlineRow.code.trim(),
        name:             inlineRow.name.trim(),
        term_number:      inlineRow.termNumber,
        periods_per_week: inlineRow.periods_per_week,
        credit_hours:     inlineRow.credit_hours,
        unit_type:        inlineRow.unit_type,
        is_outsourced:    inlineRow.is_outsourced,
        notes:            '',
        programme:        progId,
      }
      const res = await api.post('/curriculum/', payload).then(r => r.data)
      if (res.ok) {
        toast.success('Unit added')
        invalidate()
        closeInlineRow()
      } else {
        toast.error(res.error ?? 'Failed to add unit')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setInlineSaving(false)
    }
  }

  function handleInlineKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineRow() }
    if (e.key === 'Escape') closeInlineRow()
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!progId) { toast.error('Select a programme first'); return }
    try {
      const resp = await api.get(`/curriculum/export/?programme=${progId}`, { responseType: 'blob' })
      const prog = programmes.find(p => p.id === progId)
      const safe = (prog?.code ?? 'curriculum').replace(/[^a-zA-Z0-9-_]/g, '_')
      const url  = URL.createObjectURL(resp.data)
      const a    = document.createElement('a')
      a.href = url; a.download = `curriculum_${safe}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported successfully')
    } catch { toast.error('Export failed') }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !progId) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('programme_id', progId)
      const resp = await api.post('/curriculum/import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = resp.data
      if (data.ok) {
        setImportResult(data.data)
        setShowImportResult(true)
        invalidate()
        const { created, updated, errors } = data.data
        if (errors.length === 0) toast.success(`Import complete — ${created} created, ${updated} updated`)
        else toast.warning(`Import done with ${errors.length} error${errors.length !== 1 ? 's' : ''}`)
      } else {
        toast.error(data.error ?? 'Import failed')
      }
    } catch { toast.error('Import failed — check file format') }
    finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const qualifiedNames = (u: CurriculumUnit) =>
    u.qualified_trainers?.length ? u.qualified_trainers.map(t => t.name).join(', ') : '—'

  const termColor = (n: number) => TERM_COLORS[(n - 1) % TERM_COLORS.length]

  // Group units by term
  const termGroups = units.reduce<Record<number, CurriculumUnit[]>>((acc, u) => {
    const t = u.term_number ?? 1
    if (!acc[t]) acc[t] = []
    acc[t].push(u)
    return acc
  }, {})

  // Sort each term's units by code A→Z
  Object.values(termGroups).forEach(g => g.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')))

  const termNumbers = Object.keys(termGroups).map(Number).sort((a, b) => a - b)

  return (
    <SetupShell
      title="Curriculum"
      subtitle="Units per programme and term"
      onAdd={progId ? openCreate : undefined}
      addLabel="Add unit"
    >
      {/* ── Filters + toolbar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Programme</label>
            <select
              value={progId}
              onChange={e => { setProgId(e.target.value); setTermNum(undefined); closeInlineRow() }}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            >
              <option value="">Select programme…</option>
              {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {progId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Term</label>
              <select
                value={termNum ?? ''}
                onChange={e => { setTermNum(e.target.value ? +e.target.value : undefined); closeInlineRow() }}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
              >
                <option value="">All terms</option>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>Term {n}</option>
                ))}
              </select>
            </div>
          )}

          {progId && units.length > 0 && (
            <span className="text-xs font-medium text-gray-400 sm:ml-auto whitespace-nowrap">
              {units.length} unit{units.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {progId && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-gray-400" /> Export Excel
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-all shadow-sm"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {importing ? 'Importing…' : 'Import Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
            <span className="text-[11px] text-gray-400 ml-1">Export, edit in Excel, then import to update.</span>
          </div>
        )}
      </div>

      {/* ── Import result ── */}
      {showImportResult && importResult && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              {importResult.errors.length === 0
                ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                : <AlertCircle className="h-4 w-4 text-amber-500" />}
              <span className="text-sm font-semibold text-gray-700">Import Result — {importResult.programme}</span>
            </div>
            <button onClick={() => setShowImportResult(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-4">
            <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{importResult.created}</p><p className="text-xs text-gray-400 mt-0.5">Created</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-blue-600">{importResult.updated}</p><p className="text-xs text-gray-400 mt-0.5">Updated</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-gray-400">{importResult.skipped}</p><p className="text-xs text-gray-400 mt-0.5">Skipped</p></div>
            {importResult.errors.length > 0 && (
              <div className="text-center"><p className="text-2xl font-bold text-red-500">{importResult.errors.length}</p><p className="text-xs text-gray-400 mt-0.5">Errors</p></div>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
              {importResult.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 rounded bg-red-50 text-red-500 font-mono px-1.5 py-0.5">Row {e.row}</span>
                  <span className="font-mono text-gray-500">{e.code}</span>
                  <span className="text-red-500">{e.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── No programme ── */}
      {!progId && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <BookOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Select a programme</p>
          <p className="text-xs text-gray-400 mt-1">Choose a programme above to view its curriculum units.</p>
        </div>
      )}

      {/* ── Loading ── */}
      {progId && isLoading && (
        <div className="animate-pulse space-y-px rounded-xl overflow-hidden border border-gray-200">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-50" />)}
        </div>
      )}

      {/* ── Empty ── */}
      {progId && !isLoading && units.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No units for this filter</p>
          <p className="text-xs text-gray-400 mt-1">Add units manually or import from Excel.</p>
          <div className="mt-5 flex items-center gap-2">
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add unit
            </button>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
              <Upload className="h-3.5 w-3.5" /> Import Excel
            </button>
          </div>
        </div>
      )}

      {/* ── Content: grouped by term, desktop table ── */}
      {progId && !isLoading && units.length > 0 && (
        <div className="space-y-6">

          {/* Mobile cards (unchanged) */}
          <div className="md:hidden space-y-3">
            {units.map(u => {
              const typeStyle  = UNIT_TYPE_STYLE[u.unit_type ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'
              const tColor     = termColor(u.term_number ?? 1)
              const isDeleting = delId === u.id
              return (
                <div key={u.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{u.name ?? '—'}</p>
                      <code className="text-[11px] font-mono text-gray-400 mt-0.5 block">{u.code ?? '—'}</code>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(u)} disabled={isDeleting} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors">
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tColor}`}>Term {u.term_number}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${typeStyle}`}>{u.unit_type ?? '—'}</span>
                    {u.is_outsourced && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">Outsourced</span>}
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 bg-gray-50 text-gray-500 ring-gray-200">{u.periods_per_week ?? '—'} per wk</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-gray-100">
                    <p className="text-xs text-gray-500 truncate">{qualifiedNames(u)}</p>
                    <button onClick={() => setTrainerUnit(u)} className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                      <Users className="h-3 w-3" /> Manage
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: one table section per term */}
          <div className="hidden md:block space-y-6">
            {termNumbers.map(tn => {
              const termUnits  = termGroups[tn] ?? []
              const tColor     = termColor(tn)
              const isThisTerm = inlineRow?.termNumber === tn

              return (
                <div key={tn} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                  {/* Term header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${tColor}`}>
                      Term {tn}
                    </span>
                    <span className="text-[11px] text-gray-400">{termUnits.length} unit{termUnits.length !== 1 ? 's' : ''}</span>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Code', 'Unit Name', 'Per/wk', 'Type', 'Status', 'Trainers'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                        <th className="px-4 py-2.5 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {termUnits.map(u => {
                        const typeStyle  = UNIT_TYPE_STYLE[u.unit_type ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'
                        const isDeleting = delId === u.id
                        return (
                          <tr key={u.id} className="group hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <code className="text-xs font-mono bg-gray-100 text-gray-600 rounded-lg px-2 py-1">{u.code ?? '—'}</code>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-800 leading-tight max-w-[220px] truncate">{u.name ?? '—'}</p>
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-gray-700 text-sm">{u.periods_per_week ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${typeStyle}`}>{u.unit_type ?? '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {u.is_outsourced
                                ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">Outsourced</span>
                                : <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-gray-50 text-gray-400 ring-gray-200">Internal</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-gray-500 truncate max-w-[120px]">{qualifiedNames(u)}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); setTrainerUnit(u) }}
                                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                                >
                                  <Users className="h-3 w-3" /> Manage
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(u)} className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDelete(u)} disabled={isDeleting} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors" title="Delete">
                                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {/* ── Inline new row ── */}
                      {isThisTerm && inlineRow && (
                        <tr className="bg-blue-50/40 border-t-2 border-blue-200">
                          {/* Code */}
                          <td className="px-3 py-2">
                            <input
                              ref={inlineCodeRef}
                              value={inlineRow.code}
                              onChange={e => setInlineRow(r => r ? { ...r, code: e.target.value } : r)}
                              onKeyDown={handleInlineKey}
                              placeholder="Code"
                              className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                            />
                          </td>
                          {/* Name */}
                          <td className="px-3 py-2">
                            <input
                              value={inlineRow.name}
                              onChange={e => setInlineRow(r => r ? { ...r, name: e.target.value } : r)}
                              onKeyDown={handleInlineKey}
                              placeholder="Unit name"
                              className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                            />
                          </td>
                          {/* Periods/wk */}
                          <td className="px-3 py-2">
                            <input
                              type="number" min={1} max={20}
                              value={inlineRow.periods_per_week}
                              onChange={e => setInlineRow(r => r ? { ...r, periods_per_week: +e.target.value } : r)}
                              onKeyDown={handleInlineKey}
                              className="w-16 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                            />
                          </td>
                          {/* Type */}
                          <td className="px-3 py-2">
                            <select
                              value={inlineRow.unit_type}
                              onChange={e => setInlineRow(r => r ? { ...r, unit_type: e.target.value } : r)}
                              className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                            >
                              {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          {/* Outsourced toggle */}
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setInlineRow(r => r ? { ...r, is_outsourced: !r.is_outsourced } : r)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors ${
                                inlineRow.is_outsourced
                                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                  : 'bg-gray-50 text-gray-400 ring-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {inlineRow.is_outsourced ? 'Outsourced' : 'Internal'}
                            </button>
                          </td>
                          {/* Trainers placeholder */}
                          <td className="px-3 py-2">
                            <span className="text-[11px] text-gray-400 italic">assign after save</span>
                          </td>
                          {/* Save / Cancel */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={saveInlineRow}
                                disabled={inlineSaving}
                                title="Save (Enter)"
                                className="rounded-md p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                              >
                                {inlineSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={closeInlineRow}
                                title="Cancel (Esc)"
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Add row button at the bottom of each term group */}
                  <div className="border-t border-gray-100 px-4 py-2">
                    {isThisTerm ? (
                      <p className="text-[11px] text-blue-500 italic">Press Enter to save · Esc to cancel</p>
                    ) : (
                      <button
                        onClick={() => openInlineRow(tn)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-[#1e3a5f] transition-colors py-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add unit to Term {tn}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Edit/Create Modal ── */}
      <SetupModal
        open={open}
        title={editing ? 'Edit Unit' : 'Add Unit'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={!!form.code.trim() && !!form.name.trim()}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Unit Code <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              placeholder="e.g. CND1101"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Term</label>
            <input
              type="number" min={1} max={12}
              value={form.term_number}
              onChange={e => setForm(p => ({ ...p, term_number: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Unit Name <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Principles of Human Nutrition"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Periods / week</label>
            <input
              type="number" min={0} max={20}
              value={form.periods_per_week}
              onChange={e => setForm(p => ({ ...p, periods_per_week: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Credit Hours</label>
            <input
              type="number" min={0} max={20}
              value={form.credit_hours}
              onChange={e => setForm(p => ({ ...p, credit_hours: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unit Type</label>
          <select
            value={form.unit_type}
            onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          >
            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Outsourced unit</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.is_outsourced ? 'Trainer from external department' : 'Internal trainer assigned'}
            </p>
          </div>
          <div
            onClick={() => setForm(p => ({ ...p, is_outsourced: !p.is_outsourced }))}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0 ${form.is_outsourced ? 'bg-amber-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.is_outsourced ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Optional notes…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white resize-none transition-all"
          />
        </div>
      </SetupModal>

      {trainerUnit && (
        <TrainerPanel
          unitId={trainerUnit.id}
          unitName={trainerUnit.name}
          onClose={() => setTrainerUnit(null)}
        />
      )}
    </SetupShell>
  )
}