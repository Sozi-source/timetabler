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

const BLANK = { name:'', code:'', head_of_department:'' }

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const { data: depts = [], isLoading } = useDepartments()
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Department|null>(null)
  const [form,    setForm]    = useState(BLANK)
  const [delId,   setDelId]   = useState<string|null>(null)

  function openCreate() { setEditing(null); setForm(BLANK); setOpen(true) }
  function openEdit(d: Department) { setEditing(d); setForm({name:d.name,code:d.code,head_of_department:d.head_of_department??''}); setOpen(true) }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.departments })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/departments/${editing.id}/`, form).then(r=>r.data)
      : api.post('/departments/', form).then(r=>r.data),
    onSuccess: res => { if(res.ok){toast.success(editing?'Updated':'Created'); invalidate(); setOpen(false)} else toast.error(res.error??'Failed') },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id:string) => api.delete(`/departments/${id}/`).then(r=>r.data),
    onSuccess: res => { if(res.ok){toast.success('Deleted'); invalidate()} else toast.error(res.error??'Failed'); setDelId(null) },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  function handleDelete(d: Department) {
    if(!confirm(`Delete department "${d.name}"?`)) return
    setDelId(d.id); delMutation.mutate(d.id)
  }

  const F = (k:keyof typeof BLANK) => (e:React.ChangeEvent<HTMLInputElement>) => setForm(p=>({...p,[k]:e.target.value}))

  return (
    <SetupShell title="Departments" subtitle={`${depts.length} department${depts.length !== 1 ? 's' : ''}`} onAdd={openCreate} addLabel="Add department">
      <SetupTable
        loading={isLoading}
        rows={depts}
        deletingId={delId}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyIcon={<Building2 className="h-10 w-10"/>}
        emptyMsg="No departments yet"
        emptySub="Add your first department to get started"
        onEmptyAdd={openCreate}
        cols={[
          { header:'Name',   render:d=><span className="font-medium">{d.name}</span> },
          { header:'Code',   render:d=><code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{d.code}</code> },
          { header:'Head',   render:d=>d.head_of_department||<span className="text-gray-400">—</span> },
        ]}
      />
      <SetupModal open={open} title={editing?'Edit Department':'Add Department'} onClose={()=>setOpen(false)} onSave={()=>saveMutation.mutate()} saving={saveMutation.isPending} valid={!!form.name.trim()&&!!form.code.trim()}>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Name</label><input value={form.name} onChange={F('name')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Code</label><input value={form.code} onChange={F('code')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Head of Department <span className="text-gray-400 font-normal">(optional)</span></label><input value={form.head_of_department} onChange={F('head_of_department')} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
      </SetupModal>
    </SetupShell>
  )
}