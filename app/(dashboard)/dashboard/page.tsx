'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserCheck, DoorOpen,
  Play, CheckCircle, Trash2, AlertTriangle,
  Loader2, Calendar,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import { generateTimetable, publishTimetable, deleteDrafts } from '@/services/timetable'
import { toast } from 'sonner'
import TermProgress from '@/components/features/dashboard/TermProgress'
import StatCard from '@/components/features/dashboard/StatCard'

type Action = 'generate' | 'publish' | 'clear' | null

export default function DashboardPage() {
  const router = useRouter()
  const { activeTerm } = useTermStore()
  const { data, isLoading, isError, refetch } = useDashboard()
  const [busy, setBusy] = useState<Action>(null)

  async function handleGenerate() {
    setBusy('generate')
    try {
      await generateTimetable(activeTerm?.id)
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
      await publishTimetable(activeTerm?.id)
      toast.success('Drafts published')
      refetch()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400) {
        toast.success('Already published')
      } else if (status === 409) {
        toast.error('Conflicts must be resolved before publishing')
      } else {
        toast.error('Failed to publish')
      }
    } finally {
      setBusy(null)
    }
  }

  async function handleClear() {
    if (!confirm('Delete all draft entries? This cannot be undone.')) return
    setBusy('clear')
    try {
      await deleteDrafts(activeTerm?.id)
      toast.success('Draft entries cleared')
      refetch()
    } catch {
      toast.error('Failed to clear drafts')
    } finally {
      setBusy(null)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-48 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Failed to load dashboard</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">Check your connection or try again</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm text-white hover:bg-[#162d4a]"
        >
          Retry
        </button>
      </div>
    )
  }

  const {
  term,
  cohorts: total_cohorts,
  trainers: total_trainers,
  rooms: total_rooms,
} = data
const scheduled_units = (term?.published ?? 0) + (term?.drafts ?? 0)
const published_units = term?.published ?? 0
const pending_conflicts = term?.conflicts?.pending ?? 0
const draftUnits = term?.drafts ?? 0

 

  return (
    <div className="space-y-4">

      {/* ── Term Progress ────────────────────────────────────────────── */}
      {term
        ? <TermProgress term={term} />
        : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            No active term found. <button className="underline ml-1" onClick={() => router.push('/setup/terms')}>Set one up →</button>
          </div>
        )
      }

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Cohorts"
          value={total_cohorts}
          icon={Users}
          accent="default"
          badge="active"
          sub="Enrolled groups this term"
        />
        <StatCard
          label="Trainers"
          value={total_trainers}
          icon={UserCheck}
          accent="blue"
          badge="on roster"
          sub="Across all departments"
        />
        <StatCard
          label="Rooms"
          value={total_rooms}
          icon={DoorOpen}
          accent="emerald"
          badge="available"
          sub="Classrooms, labs & halls"
        />
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Timetable status + actions */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          {/* Status counts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">Timetable status</p>
              <button
                onClick={() => router.push('/timetable')}
                className="text-xs text-[#1e3a5f] hover:underline underline-offset-2"
              >
                View master →
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center border border-gray-100">
                <p className="text-2xl font-semibold text-gray-900">{scheduled_units}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center border border-emerald-100">
                <p className="text-2xl font-semibold text-emerald-700">{published_units}</p>
                <p className="text-xs text-emerald-600 mt-1">Published</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-100">
                <p className="text-2xl font-semibold text-amber-700">{draftUnits}</p>
                <p className="text-xs text-amber-600 mt-1">Draft</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${
                pending_conflicts > 0
                  ? 'bg-red-50 border-red-100'
                  : 'bg-gray-50 border-gray-100'
              }`}>
                <p className={`text-2xl font-semibold ${pending_conflicts > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {pending_conflicts}
                </p>
                <p className={`text-xs mt-1 ${pending_conflicts > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  Conflicts
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Quick actions */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={!!busy}
                className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-60 transition-colors"
              >
                {busy === 'generate'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Play className="h-4 w-4" />
                }
                {busy === 'generate' ? 'Generating…' : 'Generate timetable'}
              </button>

              {/* Publish */}
              <button
                onClick={handlePublish}
                disabled={!!busy || draftUnits === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {busy === 'publish'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle className="h-4 w-4" />
                }
                {busy === 'publish' ? 'Publishing…' : 'Publish drafts'}
              </button>

              {/* Clear drafts */}
              <button
                onClick={handleClear}
                disabled={!!busy || draftUnits === 0}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {busy === 'clear'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />
                }
                {busy === 'clear' ? 'Clearing…' : 'Clear drafts'}
              </button>

              {/* Conflicts shortcut — only if there are conflicts */}
              {pending_conflicts > 0 && (
                <button
                  onClick={() => router.push('/conflicts')}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {pending_conflicts} conflict{pending_conflicts !== 1 ? 's' : ''} to resolve
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Setup checklist / quick links */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">Setup &amp; navigation</p>
          <div className="space-y-1.5">
            {[
              { label: 'Institution', href: '/setup/institution' },
              { label: 'Departments', href: '/setup/departments' },
              { label: 'Programmes', href: '/setup/programmes' },
              { label: 'Curriculum', href: '/setup/curriculum' },
              { label: 'Trainers', href: '/setup/trainers' },
              { label: 'Rooms', href: '/setup/rooms' },
              { label: 'Cohorts', href: '/setup/cohorts' },
              { label: 'Terms', href: '/setup/terms' },
              { label: 'Constraints', href: '/constraints' },
            ].map(({ label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{label}</span>
                <span className="text-gray-400 text-xs">→</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}