'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { Menu, Calendar, ChevronDown, Check } from 'lucide-react'
import AdvanceTermModal from '@/components/features/timetable/AdvanceTermModal'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Term } from '@/types'

interface TopbarProps {
  title?: string
  onMenuClick: () => void
}

// ── Term Switcher ─────────────────────────────────────────────────────────────
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
    const by_ = (b as any).college_year ?? 0
    const as_ = (a as any).college_semester ?? 0
    const bs_ = (b as any).college_semester ?? 0
    return ay !== by_ ? by_ - ay : bs_ - as_
  })

  if (!activeTerm) return null

  const year = (activeTerm as any).college_year ?? new Date(activeTerm.start_date).getFullYear()
  const sem  = (activeTerm as any).college_semester

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3 text-xs sm:text-[13px] font-medium transition-all duration-150',
          open
            ? 'border-[#1e3a5f]/40 bg-[#1e3a5f]/6 text-[#1e3a5f] shadow-sm'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
        )}
      >
        <Calendar className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors',
          open ? 'text-[#1e3a5f]' : 'text-gray-400'
        )} />

        <span className="font-bold text-gray-900 tabular-nums">{year}</span>
        <span className="text-gray-300 hidden xs:inline">·</span>
        <span className="hidden xs:inline text-gray-600">
          {sem ? `Sem ${sem}` : activeTerm.name}
        </span>

        {/* Badges */}
        {activeTerm.is_current && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 shrink-0 leading-none">
            NOW
          </span>
        )}
        {activeTerm.week_number != null && (
          <span className="hidden sm:inline-flex rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-semibold px-1.5 py-0.5 shrink-0 leading-none tabular-nums">
            Wk {activeTerm.week_number}
          </span>
        )}

        <ChevronDown className={cn(
          'h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0',
          open && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 w-52 sm:w-60 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Switch Term
              </p>
            </div>

            <div className="py-1.5 max-h-72 overflow-y-auto">
              {sorted.length === 0 && (
                <p className="px-4 py-4 text-gray-400 text-center text-xs">No terms found</p>
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
                      'w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors text-sm',
                      isActive
                        ? 'bg-[#1e3a5f] text-white'
                        : 'hover:bg-gray-50 text-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isActive
                        ? <Check className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                        : <span className="h-3.5 w-3.5 shrink-0" />
                      }
                      <span className="font-semibold truncate">
                        {ts ? `Semester ${ts}` : t.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ty && (
                        <span className={cn(
                          'text-[11px] tabular-nums font-mono',
                          isActive ? 'text-white/60' : 'text-gray-400'
                        )}>
                          {ty}
                        </span>
                      )}
                      {t.is_current && (
                        <span className={cn(
                          'rounded-full text-[9px] font-bold px-1.5 py-0.5 leading-none',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        )}>
                          NOW
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────
export default function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-gray-200/80 bg-white/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 gap-3 shadow-sm">

      {/* Left — mobile menu trigger + page title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors active:scale-[.95] shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {/* Brand mark — visible on desktop when sidebar is always present */}
          <div className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e3a5f]/8">
            <Calendar className="h-3.5 w-3.5 text-[#1e3a5f]" />
          </div>
          <h1 className="text-sm sm:text-[15px] lg:text-base font-bold text-gray-900 truncate">
            {title ?? 'Timetabler'}
          </h1>
        </div>
      </div>

      {/* Right — term switcher + divider + advance modal */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <TermSwitcher />
        <span className="h-5 w-px bg-gray-200 shrink-0" />
        <AdvanceTermModal />
      </div>
    </header>
  )
}