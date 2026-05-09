'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurriculum, useProgrammes, useTrainers } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { CurriculumUnit } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { BookOpen, Users, Pencil, Trash2, Loader2, Plus } from 'lucide-react'
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

  const qualifiedNames = (u: CurriculumUnit) =>
    u.qualified_trainers?.length ? u.qualified_trainers.map(t => t.name).join(', ') : '—'

  const termColor = (n: number) => TERM_COLORS[(n - 1) % TERM_COLORS.length]

  return (
    <SetupShell
      title="Curriculum"
      subtitle="Units per programme and term"
      onAdd={progId ? openCreate : undefined}
      addLabel="Add unit"
    >

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Programme</label>
          <select
            value={progId}
            onChange={e => { setProgId(e.target.value); setTermNum(undefined) }}
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
              onChange={e => setTermNum(e.target.value ? +e.target.value : undefined)}
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

      {/* ── No programme selected ── */}
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
        <>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="hidden md:block animate-pulse space-y-px rounded-xl overflow-hidden border border-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50" />
            ))}
          </div>
        </>
      )}

      {/* ── Empty ── */}
      {progId && !isLoading && units.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No units for this filter</p>
          <p className="text-xs text-gray-400 mt-1">Add the first curriculum unit for this programme.</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add unit
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {progId && !isLoading && units.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {units.map(u => {
              const typeStyle = UNIT_TYPE_STYLE[u.unit_type ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'
              const tColor    = termColor(u.term_number ?? 1)
              const isDeleting = delId === u.id

              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{u.name ?? '—'}</p>
                      <code className="text-[11px] font-mono text-gray-400 mt-0.5 block">{u.code ?? '—'}</code>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={isDeleting}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Badge row */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tColor}`}>
                      Term {u.term_number}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${typeStyle}`}>
                      {u.unit_type ?? '—'}
                    </span>
                    {u.is_outsourced && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                        Outsourced
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 bg-gray-50 text-gray-500 ring-gray-200">
                      {u.periods_per_week ?? '—'} per wk
                    </span>
                  </div>

                  {/* Trainers row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-gray-100">
                    <p className="text-xs text-gray-500 truncate">{qualifiedNames(u)}</p>
                    <button
                      onClick={() => setTrainerUnit(u)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Users className="h-3 w-3" /> Manage
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Code', 'Unit Name', 'Term', 'Per/wk', 'Type', 'Status', 'Trainers'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map(u => {
                  const typeStyle  = UNIT_TYPE_STYLE[u.unit_type ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'
                  const tColor     = termColor(u.term_number ?? 1)
                  const isDeleting = delId === u.id

                  return (
                    <tr key={u.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <code className="text-xs font-mono bg-gray-100 text-gray-600 rounded-lg px-2 py-1">
                          {u.code ?? '—'}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 leading-tight max-w-[220px] truncate">{u.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tColor}`}>
                          T{u.term_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-gray-700 text-sm">
                        {u.periods_per_week ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${typeStyle}`}>
                          {u.unit_type ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.is_outsourced
                          ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">Outsourced</span>
                          : <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-gray-50 text-gray-400 ring-gray-200">Internal</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
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
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(u)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isDeleting}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                            title="Delete"
                          >
                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modal ── */}
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
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0 ${
              form.is_outsourced ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              form.is_outsourced ? 'translate-x-4' : 'translate-x-0'
            }`} />
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