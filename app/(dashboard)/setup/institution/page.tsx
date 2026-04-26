'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useInstitution } from '@/hooks/useSetup'
import { queryKeys, DAY_LABELS } from '@/types'
import type { DayCode } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'

const ALL_DAYS: DayCode[] = ['MON','TUE','WED','THU','FRI','SAT','SUN']

export default function InstitutionPage() {
  const qc = useQueryClient()
  const { data: inst, isLoading } = useInstitution()

  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [days,    setDays]    = useState<DayCode[]>([])
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (inst) { setName(inst.name); setCode(inst.code); setDays(inst.days_of_week ?? []); setLogoUrl(inst.logo_url ?? '') }
  }, [inst])

  const mutation = useMutation({
    mutationFn: () => api.put('/institution/', { name, code, days_of_week: days, logo_url: logoUrl }).then(r => r.data),
    onSuccess: (res) => {
      if (res.ok) { toast.success('Institution saved'); qc.invalidateQueries({ queryKey: queryKeys.institution }) }
      else toast.error(res.error ?? 'Save failed')
    },
    onError: () => toast.error('Network error'),
  })

  function toggleDay(d: DayCode) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  return (
    <SetupShell title="Institution" subtitle="Core settings for your institution">
      {isLoading ? (
        <div className="animate-pulse space-y-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 rounded-lg bg-gray-100"/>)}</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-6 space-y-5 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Institution Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Teaching Days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(d => (
                <button key={d} onClick={()=>toggleDay(d)} className={
                  'rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ' +
                  (days.includes(d) ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                }>{DAY_LABELS[d]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
          </div>
          <button onClick={()=>mutation.mutate()} disabled={mutation.isPending||!name.trim()} className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 transition-colors">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin"/>}Save changes
          </button>
        </div>
      )}
    </SetupShell>
  )
}
