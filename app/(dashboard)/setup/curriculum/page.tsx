'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurriculum, useProgrammes, useTrainers } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { CurriculumUnit } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { BookOpen, Users, ChevronDown } from 'lucide-react'
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
  CORE:      'bg-blue-100 text-blue-700 ring-blue-200',
  ELECTIVE:  'bg-violet-100 text-violet-700 ring-violet-200',
  PRACTICAL: 'bg-teal-100 text-teal-700 ring-teal-200',
  PROJECT:   'bg-amber-100 text-amber-700 ring-amber-200',
}

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

  const qualifiedNames = (u: CurriculumUnit) => {
    if (!u.qualified_trainers?.length) return '—'
    return u.qualified_trainers.map(t => t.name).join(', ')
  }

  return (
    <SetupShell
      title="Curriculum"
      subtitle="Units per programme and term"
      onAdd={progId ? openCreate : undefined}
      addLabel="Add unit"
    >
      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Programme</label>
          <select
            value={progId}
            onChange={e => setProgId(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          >
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {progId && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Term</label>
            <select
              value={termNum ?? ''}
              onChange={e => setTermNum(e.target.value ? +e.target.value : undefined)}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            >
              <option value="">All terms</option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Term {n}</option>
              ))}
            </select>
          </div>
        )}

        {progId && units.length > 0 && (
          <span className="ml-auto self-center text-xs font-medium text-gray-400">
            {units.length} unit{units.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Empty programme selector ────────────────────────── */}
      {!progId ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <BookOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Select a programme</p>
          <p className="text-xs text-gray-400 mt-1">Choose a programme above to view its curriculum units</p>
        </div>
      ) : (
        <SetupTable
          loading={isLoading}
          rows={units}
          deletingId={delId}
          onEdit={openEdit}
          onDelete={u => {
            if (!confirm(`Delete unit "${u.name}"? This cannot be undone.`)) return
            setDelId(u.id)
            delMutation.mutate(u.id)
          }}
          emptyIcon={<BookOpen className="h-10 w-10" />}
          emptyMsg="No units for this filter"
          onEmptyAdd={openCreate}
          cols={[
            {
              header: 'Code',
              width: '100px',
              render: u => (
                <code className="text-xs font-mono bg-gray-100 text-gray-600 rounded-lg px-2 py-1">
                  {u.code ?? '—'}
                </code>
              ),
            },
            {
              header: 'Unit Name',
              render: u => <span className="font-semibold text-gray-800">{u.name ?? '—'}</span>,
            },
            {
              header: 'Term',
              width: '60px',
              render: u => (
                <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-semibold ring-1 ring-blue-200">
                  T{u.term_number}
                </span>
              ),
            },
            {
              header: 'Periods/wk',
              width: '80px',
              render: u => (
                <span className="text-sm font-semibold text-gray-700 tabular-nums">
                  {u.periods_per_week ?? '—'}
                </span>
              ),
            },
            {
              header: 'Type',
              width: '100px',
              render: u => {
                const style = UNIT_TYPE_STYLE[u.unit_type ?? ''] ?? 'bg-gray-100 text-gray-500 ring-gray-200'
                return (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style}`}>
                    {u.unit_type ?? '—'}
                  </span>
                )
              },
            },
            {
              header: 'Outsourced',
              width: '100px',
              render: u => u.is_outsourced
                ? <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold ring-1 ring-amber-200">Outsourced</span>
                : <span className="rounded-full bg-gray-100 text-gray-400 px-2.5 py-1 text-xs font-medium ring-1 ring-gray-200">Internal</span>,
            },
            {
              header: 'Qualified Trainers',
              render: u => (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-500 truncate max-w-[160px]">{qualifiedNames(u)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setTrainerUnit(u) }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 active:scale-[.97] transition-all"
                  >
                    <Users className="h-3 w-3" /> Manage
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ── Add / Edit modal ────────────────────────────────── */}
      <SetupModal
        open={open}
        title={editing ? 'Edit Unit' : 'Add Unit'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={!!form.code.trim() && !!form.name.trim()}
      >
        {/* Code + Term */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Unit Code <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              placeholder="e.g. CND1101"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Term Number</label>
            <input
              type="number" min={1} max={12}
              value={form.term_number}
              onChange={e => setForm(p => ({ ...p, term_number: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Unit Name <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Principles of Human Nutrition"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          />
        </div>

        {/* Periods + Credits */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Periods / week</label>
            <input
              type="number" min={0} max={20}
              value={form.periods_per_week}
              onChange={e => setForm(p => ({ ...p, periods_per_week: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Credit Hours</label>
            <input
              type="number" min={0} max={20}
              value={form.credit_hours}
              onChange={e => setForm(p => ({ ...p, credit_hours: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Unit type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unit Type</label>
          <select
            value={form.unit_type}
            onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          >
            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Outsourced toggle */}
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

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Optional notes…"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] resize-none"
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