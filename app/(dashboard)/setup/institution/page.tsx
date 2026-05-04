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
import { cn } from '@/lib/utils'

const ALL_DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function InstitutionPage() {
  const qc = useQueryClient()
  const { data: inst, isLoading } = useInstitution()

  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [days,    setDays]    = useState<DayCode[]>([])
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (inst) {
      setName(inst.name)
      setCode(inst.code ?? '')
      setDays((inst.days_of_week ?? []) as DayCode[])
      setLogoUrl(inst.logo_url ?? '')
    }
  }, [inst])

  const mutation = useMutation({
    mutationFn: () =>
      api.put('/institution/', { name, code, days_of_week: days, logo_url: logoUrl }).then(r => r.data),
    onSuccess: res => {
      if (res.ok) {
        toast.success('Institution saved')
        qc.invalidateQueries({ queryKey: queryKeys.institution })
      } else {
        toast.error(res.error ?? 'Save failed')
      }
    },
    onError: () => toast.error('Network error'),
  })

  function toggleDay(d: DayCode) {
    setDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  return (
    <SetupShell title="Institution" subtitle="Core settings for your institution">
      {isLoading ? (
        <div className="animate-pulse space-y-4 max-w-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-6 space-y-6 max-w-lg">

          {/* Header icon */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="h-9 w-9 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#1e3a5f]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Institution Profile</p>
              <p className="text-xs text-gray-400">These details appear across your timetables and reports.</p>
            </div>
          </div>

          {/* Institution Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Institution Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Kenya Technical College"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Code
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. KTC"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
          </div>

          {/* Teaching Days */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Teaching Days
            </label>
            <p className="text-xs text-gray-400 mb-2.5">
              Select the days your institution runs classes. The scheduler will only use these days.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors active:scale-[.97]',
                    days.includes(d)
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
            {days.length === 0 && (
              <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                No teaching days selected — the scheduler will have nothing to work with.
              </p>
            )}
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Logo URL
              <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(optional)</span>
            </label>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
            />
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Institution logo preview"
                  className="h-10 w-10 rounded-lg object-contain border border-gray-100"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <p className="text-xs text-gray-400">Logo preview</p>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 active:scale-[.98] transition-all"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      )}
    </SetupShell>
  )
}