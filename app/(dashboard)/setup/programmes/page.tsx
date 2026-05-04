'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProgrammes, useDepartments } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Programme } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'

const BLANK = { name: '', code: '', department: '', duration_terms: 4, nqf_level: 4 }

export default function ProgrammesPage() {
  const qc = useQueryClient()
  const { data: progs = [],  isLoading } = useProgrammes()
  const { data: depts = [] }             = useDepartments()

  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Programme | null>(null)
  const [form,    setForm]    = useState({ ...BLANK })
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setOpen(true)
  }

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
      if (res.ok) {
        toast.success(editing ? 'Programme updated' : 'Programme created')
        invalidate()
        setOpen(false)
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/programmes/${id}/`).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success('Programme deleted')
        invalidate()
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(p: Programme) {
    if (!confirm(`Delete programme "${p.name}"?`)) return
    setDelId(p.id)
    delMutation.mutate(p.id)
  }

  const deptName = (id: string) => depts.find(d => d.id === id)?.name ?? id

  const isValid = !!form.name.trim() && !!form.code.trim() && !!form.department

  return (
    <SetupShell
      title="Programmes"
      subtitle={`${progs.length} programme${progs.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add programme"
    >
      <SetupTable
        loading={isLoading}
        rows={progs}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<BookOpen className="h-10 w-10" />}
        emptyMsg="No programmes yet"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: 'Name',
            render: p => (
              <span className="font-semibold text-gray-800">{p.name}</span>
            ),
          },
          {
            header: 'Code',
            render: p => (
              <code className="text-xs bg-gray-50 ring-1 ring-gray-200 rounded-lg px-2 py-0.5 font-mono text-gray-700">
                {p.code}
              </code>
            ),
          },
          {
            header: 'Department',
            render: p => (
              <span className="text-sm text-gray-600">{deptName(p.department)}</span>
            ),
          },
          {
            header: 'Terms',
            width: '70px',
            render: p => (
              <span className="text-sm font-mono tabular-nums text-gray-700">{p.duration_terms}</span>
            ),
          },
          {
            header: 'NQF',
            width: '60px',
            render: p => (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                L{p.nqf_level}
              </span>
            ),
          },
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Programme' : 'Add Programme'}
        onClose={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={isValid}
      >
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Diploma in ICT"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Code */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <input
            value={form.code}
            onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            placeholder="e.g. DICT"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Department <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <select
            value={form.department}
            onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors bg-white"
          >
            <option value="">Select department…</option>
            {depts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Duration + NQF */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Duration (terms)
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.duration_terms}
              onChange={e => setForm(p => ({ ...p, duration_terms: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              NQF Level
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.nqf_level}
              onChange={e => setForm(p => ({ ...p, nqf_level: +e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>
        </div>
      </SetupModal>
    </SetupShell>
  )
}