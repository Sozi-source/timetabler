'use client'
import { useRouter } from 'next/navigation'
import { useCohorts, useTerms } from '@/hooks/useSetup'
import { useTermStore } from '@/store'
import { useEffect } from 'react'
import { Users, Calendar, BookOpen, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cohort } from '@/types'

const TERM_COLOURS = [
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-indigo-50 border-indigo-200 text-indigo-700',
]

export default function CohortsPage() {
  const router = useRouter()
  const { data: cohorts = [], isLoading, isError } = useCohorts()
  const { data: terms = [] } = useTerms()
  const { activeTerm, setActiveTerm } = useTermStore()

  useEffect(() => {
    if (!activeTerm && terms.length > 0) {
      const active = terms.find((t) => t.is_current) ?? terms[terms.length - 1]
      if (active) setActiveTerm(active)
    }
  }, [terms, activeTerm, setActiveTerm])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-sm">Loading cohorts…</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load cohorts. Please refresh.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Cohort Timetables</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a cohort to view their weekly schedule.
          {activeTerm && (
            <span className="ml-1 font-medium text-slate-700">Showing: {activeTerm.name}</span>
          )}
        </p>
      </div>

      {cohorts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No cohorts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cohorts.map((cohort: Cohort, i: number) => (
            <button
              key={cohort.id}
              onClick={() => router.push(`/timetable/cohorts/${cohort.id}`)}
              className="group relative flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl text-left shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{cohort.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cohort.programme}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-1 shrink-0" />
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
                    TERM_COLOURS[i % TERM_COLOURS.length]
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  Term {cohort.current_term}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                  <Users className="w-3 h-3" />
                  {cohort.student_count} students
                </span>
                {cohort.progress?.total != null && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                    <BookOpen className="w-3 h-3" />
                    {cohort.progress.completed}/{cohort.progress.total} units
                  </span>
                )}
              </div>

              {cohort.is_active && (
                <span className="absolute top-4 right-10 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}