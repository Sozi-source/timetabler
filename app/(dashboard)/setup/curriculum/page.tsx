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
import { BookOpen, Users } from 'lucide-react'
import TrainerPanel from '@/components/features/curriculum/TrainerPanel'

const BLANK = { code: '', name: '', term_number: 1, periods_per_week: 2, credit_hours: 2, unit_type: 'CORE', notes: '', is_outsourced: false }

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

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setOpen(true)
  }

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

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm({ ...BLANK })
  }

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

  // qualified_trainers is an array of { id, name }
  const qualifiedNames = (u: CurriculumUnit) => {
    if (!u.qualified_trainers?.length) return '—'
    return u.qualified_trainers.map(t => t.name).join(', ')
  }

  const UNIT_TYPES = ['CORE', 'ELECTIVE', 'PRACTICAL', 'PROJECT']

  return (
    <SetupShell
      title="Curriculum"
      subtitle="Units per programme and term"
      onAdd={progId ? openCreate : undefined}
      addLabel="Add unit"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Programme</label>
          <select
            value={progId}
            onChange={e => setProgId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {progId && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Term</label>
            <select
              value={termNum ?? ''}
              onChange={e => setTermNum(e.target.value ? +e.target.value : undefined)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="">All terms</option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Term {n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!progId ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Select a programme to view curriculum units</p>
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
                <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{u.code ?? '—'}</code>
              ),
            },
            {
              header: 'Unit Name',
              render: u => <span className="font-medium">{u.name ?? '—'}</span>,
            },
            {
              header: 'Term',
              width: '60px',
              render: u => (
                <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                  T{u.term_number}
                </span>
              ),
            },
            {
              header: 'Periods/wk',
              width: '80px',
              render: u => <span className="text-sm text-gray-600">{u.periods_per_week ?? '—'}</span>,
            },
            {
              header: 'Type',
              width: '90px',
              render: u => (
                <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">
                  {u.unit_type ?? '—'}
                </span>
              ),
            },            {
              header: 'Outsourced',
              width: '90px',
              render: u => u.is_outsourced
                ? <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">Outsourced</span>
                : <span className="rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-xs font-medium">Internal</span>,
            },
            {
              header: 'Qualified Trainers',
              render: u => (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 truncate max-w-[160px]">{qualifiedNames(u)}</span>
                  <button onClick={e => { e.stopPropagation(); setTrainerUnit(u) }} className="ml-1 shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-xs text-blue-600 font-medium hover:bg-blue-100 transition-colors"><Users className="h-3 w-3" />Manage</button>
                </div>
              ),
            },
          ]}
        />
      )}

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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit Code <span className="text-red-400">*</span>
            </label>
            <input
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              placeholder="e.g. CND1101"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Term Number</label>
            <input
              type="number" min={1} max={12}
              value={form.term_number}
              onChange={e => setForm(p => ({ ...p, term_number: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Unit Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Principles of Human Nutrition"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periods per week</label>
            <input
              type="number" min={0} max={20}
              value={form.periods_per_week}
              onChange={e => setForm(p => ({ ...p, periods_per_week: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Credit hours</label>
            <input
              type="number" min={0} max={20}
              value={form.credit_hours}
              onChange={e => setForm(p => ({ ...p, credit_hours: +e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit Type</label>
          <select
            value={form.unit_type}
            onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setForm(p => ({ ...p, is_outsourced: !p.is_outsourced }))}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0 ${form.is_outsourced ? "bg-amber-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_outsourced ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <span className="text-sm text-gray-700">Outsourced unit</span>
          <span className="text-xs text-gray-400">{form.is_outsourced ? "Trainer from external dept" : "Internal trainer"}</span>
        </label>


        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Optional notes..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
          />
        </div>
      </SetupModal>
      {trainerUnit && <TrainerPanel unitId={trainerUnit.id} unitName={trainerUnit.name} onClose={() => setTrainerUnit(null)} />}
    </SetupShell>
  )
}












