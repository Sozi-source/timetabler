'use client'

import { useQuery } from '@tanstack/react-query'
import { useTermStore } from '@/store'
import { queryKeys } from '@/types'
import { getTerms } from '@/services/setup'
import { useEffect } from 'react'
import { Menu } from 'lucide-react'
import type { Term } from '@/types'

interface TopbarProps {
  title?: string
  onMenuClick: () => void
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { activeTerm, setActiveTerm } = useTermStore()
  const { data: terms = [] } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
  })

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const current = terms.find((t: Term) => t.is_current) ?? terms[0]
      setActiveTerm(current)
    }
  }, [terms, activeTerm, setActiveTerm])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 lg:text-lg">{title ?? 'Timetabler'}</h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <div className="flex items-center gap-1.5 lg:gap-2">
          <label className="hidden text-xs text-gray-500 font-medium sm:block">Term</label>
          <select
            value={activeTerm?.id ?? ''}
            onChange={(e) => {
              const t = terms.find((t: Term) => t.id === e.target.value)
              if (t) setActiveTerm(t)
            }}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] lg:px-3 lg:text-sm"
          >
            {terms.map((t: Term) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_current ? '(current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activeTerm && (
          <span className="hidden rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium sm:inline">
            Wk {activeTerm.week_number} · {activeTerm.weeks_remaining}w left
          </span>
        )}
      </div>
    </header>
  )
}