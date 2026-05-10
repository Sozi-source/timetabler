'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { Calendar, ChevronDown, Check, ArrowRight } from 'lucide-react'
import AdvanceTermModal from '@/components/features/timetable/AdvanceTermModal'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Term } from '@/types'

const BRAND      = '#0d9488'
const BRAND_DARK = '#0f766e'
const BRAND_BG   = '#f0fdfa'

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
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-all duration-150 text-left',
          open
            ? 'border-teal-300 bg-teal-50 text-teal-700 shadow-sm'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm',
        )}
      >
        <Calendar className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors',
          open ? 'text-teal-600' : 'text-gray-400',
        )} />

        <span className="text-[13px] font-bold text-gray-900 tabular-nums leading-none">
          {year}
        </span>

        {sem ? (
          <span className="text-[13px] font-medium text-gray-500 leading-none">
            · Sem {sem}
          </span>
        ) : (
          <span className="text-[13px] font-medium text-gray-500 leading-none truncate max-w-[72px]">
            · {activeTerm.name}
          </span>
        )}

        {activeTerm.is_current && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 shrink-0 leading-none">
            NOW
          </span>
        )}

        {activeTerm.week_number != null && (
          <span className="hidden sm:inline-flex rounded-full bg-teal-50 border border-teal-200 text-teal-600 text-[9px] font-semibold px-1.5 py-0.5 shrink-0 leading-none tabular-nums">
            Wk {activeTerm.week_number}
          </span>
        )}

        <ChevronDown className={cn(
          'h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0',
          open && 'rotate-180',
        )} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-20 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
            style={{ width: 'min(15rem, calc(100vw - 2rem))' }}
          >
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Switch term
              </p>
            </div>

            <div className="py-1.5 max-h-64 overflow-y-auto">
              {sorted.length === 0 && (
                <p className="px-4 py-4 text-gray-400 text-center text-xs">No terms found</p>
              )}
              {sorted.map(t => {
                const isSelected = t.id === activeTerm?.id
                const ty = (t as any).college_year ?? new Date(t.start_date).getFullYear()
                const ts = (t as any).college_semester
                return (
                  <button
                    key={t.id}
                    onClick={() => { switchMutation.mutate(t); setOpen(false) }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors',
                      isSelected ? 'text-white' : 'hover:bg-gray-50 text-gray-700',
                    )}
                    style={isSelected ? { background: BRAND } : {}}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected
                        ? <Check className="h-3.5 w-3.5 text-teal-200 shrink-0" />
                        : <span className="h-3.5 w-3.5 shrink-0" />}
                      <span className="text-[13px] font-semibold truncate">
                        {ts ? `Semester ${ts}` : t.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ty && (
                        <span className={cn(
                          'text-[11px] tabular-nums font-mono',
                          isSelected ? 'text-white/60' : 'text-gray-400',
                        )}>
                          {ty}
                        </span>
                      )}
                      {t.is_current && (
                        <span className={cn(
                          'rounded-full text-[9px] font-bold px-1.5 py-0.5 leading-none',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-700',
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

// ── Topbar ────────────────────────────────────────────────────────────────────
export default function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <>
      {/*
        Mobile: this topbar is HIDDEN — the MobileTopBar inside Sidebar.tsx
        handles the mobile header (fixed top bar + bottom tab bar).
        We only render this on lg+ (desktop).
      */}
      <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 gap-4 shadow-sm">

        {/* Left — page title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ background: BRAND_BG }}
          >
            <Calendar className="h-3.5 w-3.5" style={{ color: BRAND }} />
          </div>
          <h1 className="text-[15px] font-bold text-gray-900 truncate leading-none">
            {title ?? 'Timetabler'}
          </h1>
        </div>

        {/* Right — term switcher + advance */}
        <div className="flex items-center gap-2 shrink-0">
          <TermSwitcher />
          <span className="h-5 w-px bg-gray-200 shrink-0" />
          <AdvanceTermModal />
        </div>
      </header>

      {/*
        Mobile-only: a slim persistent term + advance strip sits just below
        the MobileTopBar (which is 56px tall). It gives mobile users access
        to term context without cluttering the top bar.
      */}
      <div className="lg:hidden sticky top-14 z-20 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-2">
        <TermSwitcher />
        <AdvanceTermModal />
      </div>
    </>
  )
}