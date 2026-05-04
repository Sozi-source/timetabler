'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDepartments } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Department } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'

const BLANK = { name: '', code: '', head_of_department: '' }

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
      if (res.ok) { toast.success(editing ? 'Department updated' : 'Department created'); invalidate(); setOpen(false) }
      else toast.error(res.error ?? 'Failed')
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
      subtitle={`${depts.length} department${depts.length !== 1 ? 's' : ''}`}
      onAdd={openCreate}
      addLabel="Add department"
    >
      <SetupTable
        loading={isLoading}
        rows={depts}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<Building2 className="h-10 w-10" />}
        emptyMsg="No departments yet"
        emptySub="Add your first department to get started"
        onEmptyAdd={openCreate}
        cols={[
          {
            header: 'Name',
            render: d => <span className="font-semibold text-gray-800">{d.name}</span>,
          },
          {
            header: 'Code',
            render: d => (
              <code className="text-xs font-mono bg-gray-100 text-gray-600 rounded-lg px-2 py-1">
                {d.code}
              </code>
            ),
          },
          {
            header: 'Head of Department',
            render: d => d.head_of_department
              ? <span className="text-sm text-gray-600">{d.head_of_department}</span>
              : <span className="text-sm text-gray-300">—</span>,
          },
        ]}
      />

      <SetupModal
        open={open}
        title={editing ? 'Edit Department' : 'Add Department'}
        onClose={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        valid={!!form.name.trim() && !!form.code.trim()}
      >
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Name <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={F('name')}
            placeholder="e.g. Health Sciences"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          />
        </div>

        {/* Code */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Code <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.code}
            onChange={F('code')}
            placeholder="e.g. HS"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          />
        </div>

        {/* Head */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Head of Department
            <span className="ml-1 normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={form.head_of_department}
            onChange={F('head_of_department')}
            placeholder="e.g. Dr. Jane Mwangi"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
          />
        </div>
      </SetupModal>
    </SetupShell>
  )
}