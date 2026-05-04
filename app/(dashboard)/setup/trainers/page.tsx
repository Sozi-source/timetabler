'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTrainers, useDepartments } from '@/hooks/useSetup'
import { queryKeys, DAY_SHORT, EMPLOYMENT_TYPE_CODE } from '@/types'
import type { Trainer, DayCode, EmploymentType } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FT', label: 'Full-time' },
  { value: 'PT', label: 'Part-time' },
  { value: 'VS', label: 'Visiting'  },
  { value: 'CT', label: 'Contract'  },
]

const EMPLOYMENT_COLOURS: Record<string, string> = {
  FT: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PT: 'bg-blue-50 text-blue-700 ring-blue-200',
  VS: 'bg-purple-50 text-purple-700 ring-purple-200',
  CT: 'bg-orange-50 text-orange-700 ring-orange-200',
}

const BLANK = {
  title:                'Mr',
  first_name:           '',
  last_name:            '',
  email:                '',
  phone:                '',
  staff_id:             '',
  department_id:        '',
  institution_id:       '',
  employment_type:      'FT' as EmploymentType,
  max_periods_per_week: 20,
  available_days:       ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayCode[],
  is_active:            true,
}

type TrainerForm = typeof BLANK

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainersPage() {
  const qc = useQueryClient()
  const { data: trainers = [], isLoading } = useTrainers()
  const { data: depts    = []            } = useDepartments()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Trainer | null>(null)
  const [form,    setForm]    = useState<TrainerForm>({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  function set<K extends keyof TrainerForm>(key: K, val: TrainerForm[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleDay(d: DayCode) {
    setForm(p => ({
      ...p,
      available_days: p.available_days.includes(d)
        ? p.available_days.filter(x => x !== d)
        : [...p.available_days, d],
    }))
  }

  function handleDeptChange(deptId: string) {
    const dept = depts.find(d => d.id === deptId)
    setForm(p => ({
      ...p,
      department_id:  deptId,
      institution_id: dept?.institution_id ?? p.institution_id,
    }))
  }

  function empCode(t: Trainer): string {
    return t.employment_type_code
      ?? EMPLOYMENT_TYPE_CODE[t.employment_type]
      ?? ''
  }

  // ── Modal open/close ───────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    const defaultInstitution = depts[0]?.institution_id ?? ''
    setForm({ ...BLANK, institution_id: defaultInstitution })
    setOpen(true)
  }

  function openEdit(t: Trainer) {
    setEditing(t)
    const matchedDept = depts.find(d =>
      t.department?.includes(d.code) || t.department?.includes(d.name)
    )
    setForm({
      title:                t.title                ?? 'Mr',
      first_name:           t.first_name            ?? '',
      last_name:            t.last_name             ?? '',
      email:                t.email                 ?? '',
      phone:                t.phone                 ?? '',
      staff_id:             t.staff_id              ?? '',
      department_id:        t.department_id         ?? matchedDept?.id ?? '',
      institution_id:       t.institution_id        ?? matchedDept?.institution_id ?? '',
      employment_type:      (EMPLOYMENT_TYPE_CODE[t.employment_type] ?? t.employment_type_code ?? 'FT') as EmploymentType,
      max_periods_per_week: t.max_periods_per_week  ?? 20,
      available_days:       (t.available_days       ?? []) as DayCode[],
      is_active:            t.is_active             ?? true,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm({ ...BLANK })
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.trainers })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title:                form.title,
        first_name:           form.first_name,
        last_name:            form.last_name,
        email:                form.email,
        phone:                form.phone,
        staff_id:             form.staff_id || `TRN-${Date.now()}`,
        department_id:        form.department_id,
        institution_id:       form.institution_id,
        employment_type:      form.employment_type,
        max_periods_per_week: form.max_periods_per_week,
        available_days:       form.available_days,
        is_active:            form.is_active,
      }
      return editing
        ? api.put(`/trainers/${editing.id}/`, payload).then(r => r.data)
        : api.post('/trainers/', payload).then(r => r.data)
    },
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Trainer updated' : 'Trainer created')
        invalidate()
        closeModal()
      } else {
        const detail = typeof res.detail === 'object'
          ? JSON.stringify(res.detail)
          : res.detail ?? res.error ?? 'Save failed'
        toast.error(detail)
      }
    },
    onError: () => toast.error('Network error — could not save trainer'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/trainers/${id}/`).then(r => r.data),
    onSuccess: (res, id) => {
      if (res.ok) {
        toast.success('Trainer deleted')
        invalidate()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      if (delId === id) setDelId(null)
    },
    onError: () => {
      toast.error('Network error — could not delete trainer')
      setDelId(null)
    },
  })

  function handleDelete(t: Trainer) {
    if (!confirm(
      `Delete trainer "${[t.title, t.first_name, t.last_name].filter(Boolean).join(' ')}"?\nThis cannot be undone.`
    )) return
    setDelId(t.id)
    delMutation.mutate(t.id)
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const isValid =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length  > 0 &&
    form.email.trim().length      > 0 &&
    form.department_id.length     > 0 &&
    form.institution_id.length    > 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SetupShell
      title="Trainers"
      subtitle={`${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add trainer"
    >
      <SetupTable
        loading={isLoading}
        rows={trainers}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<Users className="h-10 w-10" />}
        emptyMsg="No trainers configured yet"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: 'Name',
            render: t => (
              <div>
                <span className="font-semibold text-gray-800">
                  {[t.title, t.first_name, t.last_name].filter(Boolean).join(' ') || '—'}
                </span>
                {t.email && (
                  <span className="block text-xs text-gray-400 mt-0.5">{t.email}</span>
                )}
              </div>
            ),
          },
          {
            header: 'Staff ID',
            width: '100px',
            render: t => (
              <code className="text-xs bg-gray-50 ring-1 ring-gray-200 rounded-lg px-2 py-0.5 font-mono text-gray-700">
                {t.staff_id || '—'}
              </code>
            ),
          },
          {
            header: 'Department',
            render: t => (
              <span className="text-sm text-gray-600">{t.department || '—'}</span>
            ),
          },
          {
            header: 'Type',
            width: '110px',
            render: t => (
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                EMPLOYMENT_COLOURS[empCode(t)] ?? 'bg-gray-50 text-gray-600 ring-gray-200'
              )}>
                {t.employment_type || '—'}
              </span>
            ),
          },
          {
            header: 'Periods/wk',
            width: '100px',
            render: t => (
              <span className="text-sm text-gray-700 font-mono tabular-nums">
                {t.max_periods_per_week ?? '—'}
              </span>
            ),
          },
          {
            header: 'Days',
            render: t => {
              const days = (t.available_days ?? []) as DayCode[]
              if (days.length === 0)
                return <span className="text-gray-400 text-xs">All days</span>
              return (
                <div className="flex flex-wrap gap-1">
                  {days.map(d => (
                    <span key={d} className="text-xs bg-slate-50 text-slate-600 ring-1 ring-slate-200 rounded-lg px-1.5 py-0.5 font-mono">
                      {DAY_SHORT[d] ?? d}
                    </span>
                  ))}
                </div>
              )
            },
          },
          {
            header: 'Active',
            width: '60px',
            render: t => (
              <span className={cn(
                'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-offset-1',
                t.is_active
                  ? 'bg-emerald-500 ring-emerald-200'
                  : 'bg-gray-300 ring-gray-100'
              )} />
            ),
          },
        ]}
      />

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <SetupModal
        open={open}
        title={editing ? 'Edit Trainer' : 'Add Trainer'}
        onClose={closeModal}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        {/* Title + First name */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Title
            </label>
            <select
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors bg-white"
            >
              {TITLES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              First Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              placeholder="e.g. Jane"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>

        {/* Last name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Last Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            placeholder="e.g. Mwangi"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Email <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@institution.ac.ke"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+254 700 000 000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>

        {/* Staff ID + Employment type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Staff ID
            </label>
            <input
              value={form.staff_id}
              onChange={e => set('staff_id', e.target.value)}
              placeholder="e.g. TRN-001"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Employment type
            </label>
            <select
              value={form.employment_type}
              onChange={e => set('employment_type', e.target.value as EmploymentType)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors bg-white"
            >
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Department <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <select
            value={form.department_id}
            onChange={e => handleDeptChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors bg-white"
          >
            <option value="">Select department…</option>
            {depts.filter(d => d.is_active).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {form.department_id && !form.institution_id && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              Selected department has no institution linked. Check your departments setup.
            </p>
          )}
          {!form.department_id && (
            <p className="text-xs text-gray-400 mt-1.5">
              Institution is set automatically from the selected department.
            </p>
          )}
        </div>

        {/* Max periods per week */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Max periods per week
          </label>
          <input
            type="number"
            min={1}
            max={80}
            value={form.max_periods_per_week}
            onChange={e => set('max_periods_per_week', Math.min(80, Math.max(1, Number(e.target.value))))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Scheduler will not assign more than this many periods per week.
          </p>
        </div>

        {/* Available days */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Available Days
          </label>
          <p className="text-xs text-gray-400 mb-2.5">
            For full-time staff, select all days. Used to restrict part-time / visiting trainers.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors active:scale-[.97]',
                  form.available_days.includes(d)
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
          {form.available_days.length === 0 && (
            <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              No days selected — this trainer will never be scheduled.
            </p>
          )}
        </div>

        {/* Active toggle */}
        <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => set('is_active', !form.is_active)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-1',
              form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              form.is_active ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <div>
            <span className="text-sm text-gray-800 font-semibold">Active</span>
            <p className="text-xs text-gray-400 mt-0.5">Inactive trainers are excluded from scheduling.</p>
          </div>
        </div>
      </SetupModal>
    </SetupShell>
  )
}