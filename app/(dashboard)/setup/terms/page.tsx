'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTerms } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Term } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import SetupTable from '@/components/features/setup/SetupTable'
import SetupModal from '@/components/features/setup/SetupModal'
import { toast } from 'sonner'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const BLANK = { name:'', start_date:'', end_date:'', teaching_weeks:12, is_current:false }

export default function TermsPage() {
  const qc = useQueryClient()
  const { data: terms = [], isLoading } = useTerms()
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Term|null>(null)
  const [form,    setForm]    = useState({...BLANK})
  const [delId,   setDelId]   = useState<string|null>(null)

  function openCreate() { setEditing(null); setForm({...BLANK}); setOpen(true) }
  function openEdit(t: Term) { setEditing(t); setForm({name:t.name,start_date:t.start_date,end_date:t.end_date,teaching_weeks:t.teaching_weeks,is_current:t.is_current}); setOpen(true) }

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.terms })

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.put(`/terms/${editing.id}/`, form).then(r=>r.data)
      : api.post('/terms/', form).then(r=>r.data),
    onSuccess: res => { if(res.ok){toast.success(editing?'Updated':'Created'); invalidate(); setOpen(false)} else toast.error(res.error??'Failed') },
    onError: () => toast.error('Network error'),
  })

  const delMutation = useMutation({
    mutationFn: (id:string) => api.delete(`/terms/${id}/`).then(r=>r.data),
    onSuccess: res => { if(res.ok){toast.success('Deleted'); invalidate()} else toast.error(res.error??'Failed'); setDelId(null) },
    onError: () => { toast.error('Network error'); setDelId(null) },
  })

  return (
    <SetupShell title="Terms" subtitle={`${terms.length} term${terms.length !== 1 ? 's' : ''}`} onAdd={openCreate} addLabel="Add term">
      <SetupTable
        loading={isLoading} rows={terms} deletingId={delId} onEdit={openEdit}
        onDelete={t=>{ if(!confirm(`Delete term "${t.name}"?`)) return; setDelId(t.id); delMutation.mutate(t.id) }}
        emptyIcon={<CalendarDays className="h-10 w-10"/>} emptyMsg="No terms yet" onEmptyAdd={openCreate}
        cols={[
          { header:'Name',       render:t=>(
            <div className="flex items-center gap-2">
              <span className="font-medium">{t.name}</span>
              {t.is_current && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">Current</span>}
            </div>
          )},
          { header:'Start',      render:t=>t.start_date },
          { header:'End',        render:t=>t.end_date },
          { header:'Wks',        render:t=>t.teaching_weeks, width:'60px' },
        ]}
      />
      <SetupModal open={open} title={editing?'Edit Term':'Add Term'} onClose={()=>setOpen(false)} onSave={()=>saveMutation.mutate()} saving={saveMutation.isPending} valid={!!form.name.trim()&&!!form.start_date&&!!form.end_date}>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Term Name</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Term 1 2026" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">End Date</label><input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Teaching Weeks</label><input type="number" min={1} max={52} value={form.teaching_weeks} onChange={e=>setForm(p=>({...p,teaching_weeks:+e.target.value}))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"/></div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={()=>setForm(p=>({...p,is_current:!p.is_current}))} className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', form.is_current?'bg-emerald-500':'bg-gray-300')}>
            <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', form.is_current?'translate-x-4':'translate-x-0')}/>
          </div>
          <span className="text-sm text-gray-700">Set as current term</span>
        </label>
      </SetupModal>
    </SetupShell>
  )
}