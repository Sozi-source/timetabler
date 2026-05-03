'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { Menu, Calendar, ChevronDown } from 'lucide-react'
import AdvanceTermModal from '@/components/features/timetable/AdvanceTermModal'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Term } from '@/types'

interface TopbarProps {
  title?: string
  onMenuClick: () => void
}

function TermSwitcher() {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const { activeTerm, setActiveTerm } = useTermStore()
  const queryClient = useQueryClient()

  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
  })

  const switchMutation = useMutation({
    mutationFn: (t: Term) =>
      api.put(`/terms/${t.id}/`, { is_current: true }).then(r => r.data),
    onMutate: () => setSwitching(true),
    onSuccess: (_res, t) => {
      setActiveTerm(t)
      queryClient.invalidateQueries({ queryKey: queryKeys.terms })
    },
    onSettled: () => setSwitching(false),
  })

  const sorted = [...terms].sort((a, b) => {
    const ay = (a as any).college_year ?? 0
    const by = (b as any).college_year ?? 0
    const as_ = (a as any).college_semester ?? 0
    const bs_ = (b as any).college_semester ?? 0
    return ay !== by ? by - ay : bs_ - as_
  })

  if (!activeTerm) return null

  const year = (activeTerm as any).college_year ?? new Date(activeTerm.start_date).getFullYear()
  const sem  = (activeTerm as any).college_semester

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className={cn(
          'flex items-center gap-1 sm:gap-1.5 rounded-lg border px-2 py-1.5 sm:px-3 text-xs sm:text-sm transition-all',
          open
            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        )}
      >
        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 shrink-0" />
        <span className="font-semibold text-gray-800">{year}</span>
        <span className="text-gray-400 hidden xs:inline">·</span>
        <span className="font-medium text-gray-700 hidden xs:inline">
          {sem ? `Sem ${sem}` : activeTerm.name}
        </span>
        {activeTerm.is_current && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.5 shrink-0">
            Now
          </span>
        )}
        {activeTerm.week_number != null && (
          <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 shrink-0 hidden sm:inline-flex">
            Wk {activeTerm.week_number}
          </span>
        )}
        <ChevronDown className={cn(
          'h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 transition-transform shrink-0',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 sm:w-56 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 text-sm overflow-hidden">
            {sorted.length === 0 && (
              <p className="px-4 py-3 text-slate-400 text-center text-xs">No terms found</p>
            )}
            {sorted.map(t => {
              const isActive = t.id === activeTerm?.id
              const ty = (t as any).college_year ?? new Date(t.start_date).getFullYear()
              const ts = (t as any).college_semester
              return (
                <button
                  key={t.id}
                  onClick={() => { switchMutation.mutate(t); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors text-xs sm:text-sm',
                    isActive ? 'bg-[#1e3a5f] text-white' : 'hover:bg-slate-50 text-slate-700',
                  )}
                >
                  <span className="font-medium truncate">
                    {ts ? `Sem ${ts}` : t.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {ty && (
                      <span className={cn(
                        'text-[10px]',
                        isActive ? 'text-white/60' : 'text-slate-400'
                      )}>{ty}</span>
                    )}
                    {t.is_current && (
                      <span className={cn(
                        'rounded-full text-[9px] font-bold px-1.5 py-0.5',
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
                      )}>
                        Current
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-6 gap-2">

      {/* Left — menu + title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <h1 className="text-sm sm:text-base font-semibold text-gray-900 lg:text-lg truncate">
          {title ?? 'Timetabler'}
        </h1>
      </div>

      {/* Right — term switcher + advance modal */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
        <TermSwitcher />
        <span className="h-4 sm:h-5 w-px bg-gray-200 shrink-0" />
        <AdvanceTermModal />
      </div>
    </header>
  )
}