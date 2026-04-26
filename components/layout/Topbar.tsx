'use client'

import { useQuery } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { useEffect } from 'react'
import type { Term } from '@/types'

export default function Topbar({ title }: { title?: string }) {
  const { activeTerm, setActiveTerm } = useTermStore()
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title ?? 'Timetabler'}</h1>

      <div className="flex items-center gap-3">
        {/* Term selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Term</label>
          <select
            value={activeTerm?.id ?? ''}
            onChange={(e) => {
              const t = terms.find((t: Term) => t.id === e.target.value)
              if (t) setActiveTerm(t)
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            {terms.map((t: Term) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_current ? '(current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Term info pill */}
        {activeTerm && (
          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium">
            Week {activeTerm.week_number} · {activeTerm.weeks_remaining}w left
          </span>
        )}
      </div>
    </header>
  )
}
