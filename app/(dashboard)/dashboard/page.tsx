'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Play, CheckCircle, Trash2, AlertTriangle,
  Loader2, Calendar, ChevronRight,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import { generateTimetable, publishTimetable, deleteDrafts } from '@/services/timetable'
import { toast } from 'sonner'
import HeroBanner from '@/components/features/dashboard/HeroBanner'
import QuickStats from '@/components/features/dashboard/QuickStats'
import TimetableStatus from '@/components/features/dashboard/TimetableStatus'
import QuickActions from '@/components/features/dashboard/QuickActions'
import SetupNav from '@/components/features/dashboard/SetupNav'

type Action = 'generate' | 'publish' | 'clear' | null

export default function DashboardPage() {
  const router = useRouter()
  const { activeTerm } = useTermStore()
  const { data, isLoading, isError, refetch } = useDashboard()
  const [busy, setBusy] = useState<Action>(null)

  async function handleGenerate() {
    setBusy('generate')
    try {
      if (!activeTerm?.id) return
      await generateTimetable(activeTerm.id)
      toast.success('Timetable generated successfully')
      refetch()
    } catch {
      toast.error('Failed to generate timetable')
    } finally {
      setBusy(null)
    }
  }

  async function handlePublish() {
    setBusy('publish')
    try {
      if (!activeTerm?.id) return
      await publishTimetable(activeTerm.id)
      toast.success('Drafts published')
      refetch()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400)      toast.success('Already published')
      else if (status === 409) toast.error('Conflicts must be resolved before publishing')
      else                     toast.error('Failed to publish')
    } finally {
      setBusy(null)
    }
  }

  async function handleClear() {
    if (!confirm('Delete all draft entries? This cannot be undone.')) return
    setBusy('clear')
    try {
      if (!activeTerm?.id) return
      await deleteDrafts(activeTerm.id)
      toast.success('Draft entries cleared')
      refetch()
    } catch {
      toast.error('Failed to clear drafts')
    } finally {
      setBusy(null)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        {/* Hero skeleton */}
        <div className="h-[220px] bg-[#1a3352] animate-pulse" />
        <div className="px-4 pt-5 space-y-4">
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white animate-pulse border border-gray-100" />
            ))}
          </div>
          {/* Cards skeleton */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-base font-semibold text-gray-800">Failed to load dashboard</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">Check your connection or try again</p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const { term, cohorts, trainers, rooms } = data
  const draftUnits        = term?.drafts ?? 0
  const publishedUnits    = term?.published ?? 0
  const scheduledUnits    = draftUnits + publishedUnits
  const pendingConflicts  = term?.conflicts?.pending ?? 0

  return (
    <div className="min-h-screen bg-[#f5f7fa]">

      {/* ── Hero banner (dark header) ──────────────────────────────── */}
      {term ? (
        <HeroBanner term={term} />
      ) : (
        <div className="bg-[#1a3352] px-5 pt-10 pb-6">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
            <Calendar className="h-4 w-4 text-amber-300 shrink-0" />
            <p className="text-sm font-medium text-amber-200">
              No active term.{' '}
              <button
                className="underline underline-offset-2 text-amber-100"
                onClick={() => router.push('/setup/terms')}
              >
                Set one up →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-24 space-y-4">

        {/* Quick stats strip */}
        <QuickStats cohorts={cohorts} trainers={trainers} rooms={rooms} />

        {/* Timetable status */}
        <TimetableStatus
          scheduled={scheduledUnits}
          published={publishedUnits}
          drafts={draftUnits}
          conflicts={pendingConflicts}
          onViewMaster={() => router.push('/timetable')}
        />

        {/* Quick actions */}
        <QuickActions
          busy={busy}
          draftUnits={draftUnits}
          pendingConflicts={pendingConflicts}
          onGenerate={handleGenerate}
          onPublish={handlePublish}
          onClear={handleClear}
          onResolveConflicts={() => router.push('/conflicts')}
        />

        {/* Setup nav */}
        <SetupNav onNavigate={(href) => router.push(href)} />

      </div>
    </div>
  )
}