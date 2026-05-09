'use client'
import { useRouter } from 'next/navigation'
import { useTrainers, useTerms } from '@/hooks/useSetup'
import { useTermStore } from '@/store'
import { useEffect } from 'react'
import { User, Mail, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Trainer } from '@/types'

const AVATAR_COLOURS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function trainerInitials(trainer: Trainer): string {
  return `${trainer.first_name?.[0] ?? ''}${trainer.last_name?.[0] ?? ''}`.toUpperCase()
}

function trainerFullName(trainer: Trainer): string {
  return [trainer.title, trainer.first_name, trainer.last_name].filter(Boolean).join(' ')
}

export default function TrainersPage() {
  const router = useRouter()
  const { data: trainers = [], isLoading, isError } = useTrainers()
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
          <span className="text-sm">Loading trainers…</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load trainers. Please refresh.</span>
        </div>
      </div>
    )
  }

  const activeTrainers = trainers.filter((t: Trainer) => t.is_active)

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Trainer Timetables</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a trainer to view their personal schedule.
          {activeTerm && (
            <span className="ml-1 font-medium text-slate-700">Showing: {activeTerm.name}</span>
          )}
        </p>
      </div>

      {activeTrainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <User className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No active trainers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTrainers.map((trainer: Trainer, i: number) => (
            <button
              key={trainer.id}
              onClick={() => router.push(`/timetable/trainers/${trainer.id}`)}
              className="group flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl text-left shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150"
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  AVATAR_COLOURS[i % AVATAR_COLOURS.length]
                )}
              >
                {trainerInitials(trainer)}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{trainerFullName(trainer)}</p>
                {trainer.email && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {trainer.email}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5 truncate">{trainer.department}</p>
                <span
                  className={cn(
                    'mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                    trainer.employment_type === 'FT' || trainer.employment_type === 'Full-time'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {trainer.employment_type}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}