'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDepartments } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Department } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { Building2, Plus, Pencil, Trash2, Loader2, User } from 'lucide-react'

const BLANK = { name: '', code: '', head_of_department: '' }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

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

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const { data: depts = [], isLoading } = useDepartments()
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form,    setForm]    = useState(BLANK)
  const [delId,   setDelId]   = useState<string | null>(null)

  function openCreate() { setEditing(null); setForm(BLANK); setOpen(true) }
  function openEdit(d: Department) {
    setEditing(d)
    setForm({ name: d.name, code: d.code, head_of_department: d.head_of_department ?? '' })
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.departments })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/departments/${editing.id}/`, form).then(r => r.data)
      : api.post('/departments/', form).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success(editing ? 'Department updated' : 'Department created')
        invalidate()
        setOpen(false)
      } else toast.error(res.error ?? 'Failed')
    },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}/`).then(r => r.data),
    onSuccess: res => {
      if (res.ok) { toast.success('Department deleted'); invalidate() }
      else toast.error(res.error ?? 'Failed')
      setDelId(null)
    },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(d: Department) {
    if (!confirm(`Delete department "${d.name}"?`)) return
    setDelId(d.id)
    delMutation.mutate(d.id)
  }

  const F = (k: keyof typeof BLANK) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <SetupShell
      title="Departments"
      subtitle={`${depts.length} department${depts.length !== 1 ? 's' : ''} configured`}
      onAdd={openCreate}
      addLabel="Add department"
    >

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && depts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Building2 className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No departments yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first department to get started.</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add department
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      {!isLoading && depts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(d => {
            const color = colorFor(d.name)
            const isDeleting = delId === d.id

            return (
              <div
                key={d.id}
                className="group relative rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-5 flex flex-col gap-3"
              >
                {/* Top row: avatar + code + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
                      {getInitials(d.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{d.name}</p>
                      <code className="text-[11px] font-mono text-gray-400 tracking-wider">{d.code}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(d)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      disabled={isDeleting}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                      title="Delete"
                    >
                      {isDeleting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Head of department */}
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                  {d.head_of_department
                    ? <span className="text-xs text-gray-600 truncate">{d.head_of_department}</span>
                    : <span className="text-xs text-gray-300 italic">No HOD assigned</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <SetupModal
        open={open}
        title={editing ? 'Edit Department' : 'Add Department'}
        onClose={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={!!form.name.trim() && !!form.code.trim()}
      >
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Name <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={F('name')}
            placeholder="e.g. Health Sciences"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Code <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.code}
            onChange={F('code')}
            placeholder="e.g. HS"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Head of Department
            <span className="ml-1 normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={form.head_of_department}
            onChange={F('head_of_department')}
            placeholder="e.g. Dr. Jane Mwangi"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>
      </SetupModal>
    </SetupShell>
  )
}