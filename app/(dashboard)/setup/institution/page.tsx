'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useInstitution } from '@/hooks/useSetup'
import { queryKeys, DAY_LABELS } from '@/types'
import type { DayCode } from '@/types'
import api from '@/lib/api'
import SetupShell from '@/components/features/setup/SetupShell'
import { toast } from 'sonner'
import { Loader2, Building2, Calendar, Hash, ImageIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALL_DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const DAY_SHORT: Record<DayCode, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu',
  FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
}

export default function InstitutionPage() {
  const qc = useQueryClient()
  const { data: inst, isLoading } = useInstitution()

  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [days,    setDays]    = useState<DayCode[]>([])
  const [logoUrl, setLogoUrl] = useState('')
  const [saved,   setSaved]   = useState(false)

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
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
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

  if (isLoading) {
    return (
      <SetupShell title="Institution" subtitle="Core settings for your institution">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100" />
        </div>
      </SetupShell>
    )
  }

  return (
    <SetupShell title="Institution" subtitle="Core settings for your institution">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: main form ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Name */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Institution Name</p>
                <p className="text-xs text-gray-400">The full official name of your institution</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kenya Technical College"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Code */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                <Hash className="h-4 w-4 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Institution Code</p>
                <p className="text-xs text-gray-400">Short identifier used in reports and exports</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. KTC"
                maxLength={10}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono uppercase tracking-widest text-gray-800 placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Teaching Days */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Teaching Days</p>
                <p className="text-xs text-gray-400">The scheduler will only use the selected days</p>
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-7 gap-2">
                {ALL_DAYS.map(d => {
                  const active = days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        'flex items-center justify-center rounded-xl py-3 text-xs font-semibold border transition-all active:scale-95 select-none',
                        active
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                      )}
                    >
                      {DAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>

              {/* Day count */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {days.length === 0
                    ? 'No days selected'
                    : `${days.length} day${days.length !== 1 ? 's' : ''} selected · ${days.map(d => DAY_SHORT[d]).join(', ')}`}
                </p>
                {days.length === 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    Required for scheduling
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">
              {!name.trim() && 'Institution name is required to save.'}
            </p>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name.trim()}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[.98] transition-all disabled:opacity-50',
                saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1e3a5f] hover:bg-[#162d4a]'
              )}
            >
              {mutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : saved
                ? <CheckCircle2 className="h-4 w-4" />
                : null}
              {saved ? 'Saved!' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* ── Right: logo + summary ────────────────────────────── */}
        <div className="space-y-4">

          {/* Logo */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Logo</p>
                <p className="text-xs text-gray-400">Optional</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Preview */}
              <div className="flex items-center justify-center h-28 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-20 w-20 object-contain rounded-lg"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-300">
                    <Building2 className="h-8 w-8" />
                    <span className="text-[11px]">No logo</span>
                  </div>
                )}
              </div>
              <input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://cdn.example.com/logo.png"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Summary</p>
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-gray-400 shrink-0">Name</span>
                <span className="text-xs font-medium text-gray-800 text-right truncate max-w-[60%]">
                  {name || <span className="text-gray-300 font-normal">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">Code</span>
                <span className="text-xs font-mono font-semibold text-gray-700 tracking-wider">
                  {code || <span className="text-gray-300 font-sans font-normal tracking-normal">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">Teaching days</span>
                <span className="text-xs font-medium text-gray-700">
                  {days.length > 0
                    ? `${days.length} / 7`
                    : <span className="text-amber-500">None</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SetupShell>
  )
}