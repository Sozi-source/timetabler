'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserCheck, DoorOpen,
  Play, CheckCircle, Trash2, AlertTriangle,
  Loader2, Calendar, ChevronRight,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import { generateTimetable, publishTimetable, deleteDrafts } from '@/services/timetable'
import { toast } from 'sonner'
import TermProgress from '@/components/features/dashboard/TermProgress'
import StatCard from '@/components/features/dashboard/StatCard'

type Action = 'generate' | 'publish' | 'clear' | null

const SETUP_LINKS = [
  { label: 'Institution',  href: '/setup/institution' },
  { label: 'Departments',  href: '/setup/departments' },
  { label: 'Programmes',   href: '/setup/programmes' },
  { label: 'Curriculum',   href: '/setup/curriculum' },
  { label: 'Trainers',     href: '/setup/trainers' },
  { label: 'Rooms',        href: '/setup/rooms' },
  { label: 'Cohorts',      href: '/setup/cohorts' },
  { label: 'Terms',        href: '/setup/terms' },
  { label: 'Constraints',  href: '/constraints' },
] as const

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

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-52 rounded-2xl bg-gray-100" />
          <div className="h-52 rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
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

  const { term, cohorts: total_cohorts, trainers: total_trainers, rooms: total_rooms } = data
  const scheduled_units   = (term?.published ?? 0) + (term?.drafts ?? 0)
  const published_units   = term?.published ?? 0
  const pending_conflicts = term?.conflicts?.pending ?? 0
  const draftUnits        = term?.drafts ?? 0

  return (
    <div className="space-y-5">

      {/* ── Term progress ──────────────────────────────────── */}
      {term ? (
        <TermProgress term={term} />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            No active term found.{' '}
            <button className="underline underline-offset-2" onClick={() => router.push('/setup/terms')}>
              Set one up →
            </button>
          </p>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Cohorts"  value={total_cohorts}  icon={Users}      accent="default" badge="active"    sub="Enrolled groups this term" />
        <StatCard label="Trainers" value={total_trainers} icon={UserCheck}  accent="blue"    badge="on roster" sub="Across all departments"     />
        <StatCard label="Rooms"    value={total_rooms}    icon={DoorOpen}   accent="emerald" badge="available" sub="Classrooms, labs & halls"   />
      </div>

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Timetable status + actions */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-5">

          {/* Status counts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Timetable status</p>
              <button
                onClick={() => router.push('/timetable')}
                className="text-xs font-medium text-[#1e3a5f] hover:underline underline-offset-2"
              >
                View master →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Scheduled', value: scheduled_units,   bg: 'bg-gray-50',     border: 'border-gray-100',    text: 'text-gray-900',    sub: 'text-gray-500'   },
                { label: 'Published', value: published_units,   bg: 'bg-emerald-50',  border: 'border-emerald-100', text: 'text-emerald-700', sub: 'text-emerald-500' },
                { label: 'Draft',     value: draftUnits,        bg: 'bg-amber-50',    border: 'border-amber-100',   text: 'text-amber-700',   sub: 'text-amber-500'  },
                {
                  label: 'Conflicts',
                  value: pending_conflicts,
                  bg:     pending_conflicts > 0 ? 'bg-red-50'    : 'bg-gray-50',
                  border: pending_conflicts > 0 ? 'border-red-100' : 'border-gray-100',
                  text:   pending_conflicts > 0 ? 'text-red-700' : 'text-gray-900',
                  sub:    pending_conflicts > 0 ? 'text-red-500' : 'text-gray-500',
                },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} p-3 text-center`}>
                  <p className={`text-2xl font-bold tabular-nums ${stat.text}`}>{stat.value}</p>
                  <p className={`text-xs mt-1 font-medium ${stat.sub}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Quick actions */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Quick actions</p>
            <div className="flex flex-wrap gap-2">

              <button
                onClick={handleGenerate}
                disabled={!!busy}
                className="flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 active:scale-[.98] transition-all shadow-sm"
              >
                {busy === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {busy === 'generate' ? 'Generating…' : 'Generate timetable'}
              </button>

              <button
                onClick={handlePublish}
                disabled={!!busy || draftUnits === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 active:scale-[.98] transition-all shadow-sm"
              >
                {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {busy === 'publish' ? 'Publishing…' : 'Publish drafts'}
              </button>

              <button
                onClick={handleClear}
                disabled={!!busy || draftUnits === 0}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 active:scale-[.98] transition-all shadow-sm"
              >
                {busy === 'clear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {busy === 'clear' ? 'Clearing…' : 'Clear drafts'}
              </button>

              {pending_conflicts > 0 && (
                <button
                  onClick={() => router.push('/conflicts')}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 active:scale-[.98] transition-all"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {pending_conflicts} conflict{pending_conflicts !== 1 ? 's' : ''} to resolve
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Setup & navigation */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Setup &amp; navigation</p>
          <div className="space-y-0.5">
            {SETUP_LINKS.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1e3a5f] transition-colors"
              >
                <span>{label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#1e3a5f] transition-colors" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}