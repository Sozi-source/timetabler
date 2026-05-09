'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProgrammes, useDepartments } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Programme } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { BookOpen, Pencil, Trash2, Loader2, Plus } from 'lucide-react'

const BLANK = { name: '', code: '', department: '', duration_terms: 4, nqf_level: 4 }

// Deterministic color from string
const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
]
function colorFor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function ProgrammesPage() {
  const qc = useQueryClient()
  const { data: progs = [],  isLoading } = useProgrammes()
  const { data: depts = [] }             = useDepartments()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Programme | null>(null)
  const [form,    setForm]    = useState({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setOpen(true) }
  function openEdit(p: Programme) {
    setEditing(p)
    setForm({
      name:           p.name,
      code:           p.code,
      department:     p.department,
      duration_terms: p.duration_terms ?? 4,
      nqf_level:      p.nqf_level      ?? 4,
    })
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.programmes })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/programmes/${editing.id}/`, form).then(r => r.data)
      : api.post('/programmes/', form).then(r => r.data),
    onSuccess: res => {
      if (res.ok) { toast.success(editing ? 'Programme updated' : 'Programme created'); invalidate(); setOpen(false) }
      else toast.error(res.error ?? 'Save failed')
    },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/programmes/${id}/`).then(r => r.data),
    onSuccess: res => {
      if (res.ok) { toast.success('Programme deleted'); invalidate() }
      else toast.error(res.error ?? 'Delete failed')
      setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(p: Programme) {
    if (!confirm(`Delete programme "${p.name}"?`)) return
    setDelId(p.id)
    delMutation.mutate(p.id)
  }

  const deptName = (id: string) => depts.find(d => d.id === id)?.name ?? '—'
  const isValid  = !!form.name.trim() && !!form.code.trim() && !!form.department

  return (
    <SetupShell
      title="Programmes"
      subtitle={`${progs.length} programme${progs.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add programme"
    >

      {/* ── Loading ── */}
      {isLoading && (
        <>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden md:block animate-pulse space-y-px rounded-xl overflow-hidden border border-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50" />
            ))}
          </div>
        </>
      )}

      {/* ── Empty ── */}
      {!isLoading && progs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No programmes yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first programme to get started.</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add programme
          </button>
        </div>
      )}

      {!isLoading && progs.length > 0 && (
        <>
          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {progs.map(p => {
              const color      = colorFor(p.name)
              const isDeleting = delId === p.id

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-start gap-3"
                >
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
                    {getInitials(p.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{p.name}</p>
                        <code className="text-[11px] font-mono text-gray-400 tracking-wider">{p.code}</code>
                      </div>
                      {/* Actions always visible on mobile */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isDeleting}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] text-gray-500 truncate max-w-[160px]">{deptName(p.department)}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[11px] text-gray-500">{p.duration_terms} terms</span>
                      <span className="text-gray-200">·</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        L{p.nqf_level}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Code', 'Department', 'Terms', 'NQF'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {progs.map(p => {
                  const isDeleting = delId === p.id
                  return (
                    <tr key={p.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800 leading-tight">{p.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-1 font-mono">
                          {p.code}
                        </code>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-sm">
                        {deptName(p.department)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm font-mono tabular-nums">
                        {p.duration_terms}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                          L{p.nqf_level}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
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
        title={editing ? 'Edit Programme' : 'Add Programme'}
        onClose={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Diploma in ICT"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.code}
            onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            placeholder="e.g. DICT"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono uppercase text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Department <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <select
            value={form.department}
            onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          >
            <option value="">Select department…</option>
            {depts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Duration (terms)
            </label>
            <input
              type="number" min={1} max={12}
              value={form.duration_terms}
              onChange={e => setForm(p => ({ ...p, duration_terms: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              NQF Level
            </label>
            <input
              type="number" min={1} max={10}
              value={form.nqf_level}
              onChange={e => setForm(p => ({ ...p, nqf_level: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
        </div>
      </SetupModal>
    </SetupShell>
  )
}