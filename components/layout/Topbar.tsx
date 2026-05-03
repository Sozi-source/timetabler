'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { useEffect, useState, useRef } from 'react'
import { Menu, Loader2, ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Term } from '@/types'
import AdvanceTermModal from '@/components/features/timetable/AdvanceTermModal'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title?: string
  onMenuClick: () => void
}

// ── Group terms by academic year (derived from start_date) ────────────────────
// An "academic year" here is simply the calendar year of the term's start_date.
// e.g. start_date "2025-01-06" → year "2025"
// Terms are already ordered by -start_date from the API, so we preserve that.

interface TermGroup {
  year: string
  terms: Term[]
}

function groupTermsByYear(terms: Term[]): TermGroup[] {
  const map = new Map<string, Term[]>()
  for (const t of terms) {
    const year = t.start_date?.slice(0, 4) ?? 'Unknown'
    if (!map.has(year)) map.set(year, [])
    map.get(year)!.push(t)
  }
  // Sort years descending (most recent first)
  const sorted = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  return sorted.map(([year, terms]) => ({ year, terms }))
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const qc = useQueryClient()
  const { activeTerm, setActiveTerm } = useTermStore()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
  })

  // Auto-select current term on first load
  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const current = terms.find((t: Term) => t.is_current) ?? terms[0]
      setActiveTerm(current)
    }
  }, [terms, activeTerm, setActiveTerm])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  // Mutation: set a term as current in the DB
  const switchMutation = useMutation({
    mutationFn: (termId: string) =>
      api.put(`/terms/${termId}/`, { is_current: true }).then(r => r.data),
    onSuccess: (res, termId) => {
      if (res.ok) {
        const t = terms.find((t: Term) => t.id === termId)
        if (t) {
          setActiveTerm({ ...t, is_current: true })
          toast.success(`Switched to ${t.name}`)
        }
        qc.invalidateQueries({ queryKey: queryKeys.terms })
        qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      } else {
        toast.error(res.error ?? 'Failed to switch term')
      }
    },
    onError: () => toast.error('Network error — could not switch term'),
  })

  function handleTermChange(termId: string) {
    if (termId === activeTerm?.id) {
      setShowPicker(false)
      return
    }
    switchMutation.mutate(termId)
    setShowPicker(false)
  }

  // ── Prev / Next navigation ────────────────────────────────────────────────
  // Terms from API are sorted -start_date, so index 0 = most recent.
  // "next" = lower index (more recent), "prev" = higher index (older)
  const sortedTerms: Term[] = [...terms].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )
  const currentIdx = sortedTerms.findIndex(t => t.id === activeTerm?.id)
  const prevTerm   = currentIdx > 0 ? sortedTerms[currentIdx - 1] : null
  const nextTerm   = currentIdx < sortedTerms.length - 1 ? sortedTerms[currentIdx + 1] : null

  const groups = groupTermsByYear(terms)

  const activeYear = activeTerm?.start_date?.slice(0, 4) ?? ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left — menu + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 lg:text-lg">
          {title ?? 'Timetabler'}
        </h1>
      </div>

      {/* Right — term navigator + advance button */}
      <div className="flex items-center gap-2 lg:gap-3">

        {/* ── Term Navigator ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1" ref={pickerRef}>

          {/* Prev arrow */}
          <button
            onClick={() => prevTerm && handleTermChange(prevTerm.id)}
            disabled={!prevTerm || switchMutation.isPending}
            title={prevTerm ? `← ${prevTerm.name}` : 'No earlier term'}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Active term button — opens year-grouped picker */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(o => !o)}
              disabled={switchMutation.isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                showPicker
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {switchMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : (
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              )}

              <span className="max-w-[140px] truncate">
                {activeTerm?.name ?? 'Select term'}
              </span>

              {/* Academic year badge */}
              {activeYear && (
                <span className="hidden sm:inline rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 shrink-0">
                  {activeYear}
                </span>
              )}

              {activeTerm?.is_current && (
                <span className="hidden sm:inline rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 shrink-0">
                  Current
                </span>
              )}

              <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform shrink-0', showPicker && 'rotate-180')} />
            </button>

            {/* ── Year-grouped picker ─────────────────────────────────────── */}
            {showPicker && (
              <div className="absolute right-0 top-full mt-1 z-40 w-64 rounded-xl border border-gray-200 bg-white shadow-xl py-2 text-sm overflow-hidden">
                {groups.length === 0 && (
                  <p className="px-4 py-3 text-gray-400 text-center text-xs">No terms found</p>
                )}

                {groups.map((group, gi) => (
                  <div key={group.year}>
                    {/* Year header */}
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {group.year}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Terms in this year */}
                    {group.terms.map(t => {
                      const isActive  = t.id === activeTerm?.id
                      const isCurrent = t.is_current
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleTermChange(t.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors',
                            isActive
                              ? 'bg-[#1e3a5f] text-white'
                              : 'hover:bg-gray-50 text-gray-700',
                          )}
                        >
                          <span className="font-medium truncate">{t.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isCurrent && !isActive && (
                              <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5">
                                Current
                              </span>
                            )}
                            {isCurrent && isActive && (
                              <span className="rounded-full bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5">
                                Current
                              </span>
                            )}
                            {/* Week info for current term */}
                            {isActive && t.week_number != null && (
                              <span className={cn(
                                'text-[9px] font-medium',
                                isActive ? 'text-white/70' : 'text-gray-400',
                              )}>
                                Wk {t.week_number}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}

                    {/* Divider between years */}
                    {gi < groups.length - 1 && (
                      <div className="mt-1 mb-1 border-t border-gray-100" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next arrow */}
          <button
            onClick={() => nextTerm && handleTermChange(nextTerm.id)}
            disabled={!nextTerm || switchMutation.isPending}
            title={nextTerm ? `${nextTerm.name} →` : 'No later term'}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Week badge — only for active term */}
        {activeTerm && (
          <span className="topbar-week-badge hidden rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium lg:inline">
            Wk {activeTerm.week_number} · {activeTerm.weeks_remaining}w left
          </span>
        )}

        {/* Divider */}
        {activeTerm && (
          <span className="hidden sm:block h-5 w-px bg-gray-200" />
        )}

        {/* Advance Term button */}
        {activeTerm && (
          <AdvanceTermModal
            termId={activeTerm.id}
            termName={activeTerm.name}
          />
        )}
      </div>
    </header>
  )
}