'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Play, CheckCircle, Trash2, AlertTriangle, Loader2,
  Calendar, ChevronRight, BookOpen, Users, DoorOpen,
  TrendingUp, Clock, ShieldCheck, LayoutGrid, GraduationCap,
  Layers, ArrowUpRight, Zap,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import { generateTimetable, publishTimetable, deleteDrafts } from '@/services/timetable'
import { toast } from 'sonner'
import HeroCard from '@/components/features/dashboard/HeroCard'

type Action = 'generate' | 'publish' | 'clear' | null

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  teal:       '#0d9488',
  tealDark:   '#0f766e',
  tealDeep:   '#134e4a',
  tealLight:  '#f0fdfa',
  tealMid:    '#ccfbf1',
  tealGlass:  'rgba(13,148,136,0.08)',
  tealBorder: 'rgba(13,148,136,0.18)',
}

// ── Setup links ───────────────────────────────────────────────────────────────
const SETUP_LINKS = [
  { href: '/setup/terms',       icon: Calendar,      label: 'Terms'       },
  { href: '/setup/cohorts',     icon: GraduationCap, label: 'Cohorts'     },
  { href: '/setup/trainers',    icon: Users,         label: 'Trainers'    },
  { href: '/setup/rooms',       icon: DoorOpen,      label: 'Rooms'       },
  { href: '/setup/curriculum',  icon: BookOpen,      label: 'Curriculum'  },
  { href: '/setup/periods',     icon: Clock,         label: 'Periods'     },
  { href: '/setup/departments', icon: LayoutGrid,    label: 'Departments' },
  { href: '/setup/programmes',  icon: TrendingUp,    label: 'Programmes'  },
]

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  accent: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-white p-5 flex flex-col gap-4 group hover:shadow-md transition-all duration-300"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      {/* Accent bar top */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}15` }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-1.5">{label}</p>
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-gray-700 tabular-nums">
          {value} <span className="text-gray-400 font-normal">/ {total}</span>
          <span className="ml-1.5 text-[10px] font-semibold" style={{ color }}>{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  icon: Icon,
  label,
  description,
  onClick,
  loading,
  disabled,
  variant,
}: {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  variant: 'primary' | 'success' | 'danger' | 'warning'
}) {
  const styles = {
    primary: {
      wrap:  'bg-teal-600 hover:bg-teal-700 border-teal-600',
      text:  'text-white',
      sub:   'text-teal-100',
      icon:  'bg-white/15',
      iconC: '#fff',
    },
    success: {
      wrap:  'bg-emerald-600 hover:bg-emerald-700 border-emerald-600',
      text:  'text-white',
      sub:   'text-emerald-100',
      icon:  'bg-white/15',
      iconC: '#fff',
    },
    danger: {
      wrap:  'bg-white hover:bg-red-50 border-red-100',
      text:  'text-red-700',
      sub:   'text-red-400',
      icon:  'bg-red-50',
      iconC: '#b91c1c',
    },
    warning: {
      wrap:  'bg-white hover:bg-amber-50 border-amber-100',
      text:  'text-amber-800',
      sub:   'text-amber-500',
      icon:  'bg-amber-50',
      iconC: '#d97706',
    },
  }
  const s = styles[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-3.5 w-full rounded-xl px-4 py-3.5 border text-left disabled:opacity-40 active:scale-[0.98] transition-all duration-150 ${s.wrap}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.icon}`}>
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: s.iconC }} />
          : <Icon className="w-4 h-4" style={{ color: s.iconC }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-tight ${s.text}`}>{label}</p>
        <p className={`text-[11px] mt-0.5 leading-snug ${s.sub}`}>{description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 opacity-50 ${s.text}`} />
    </button>
  )
}

// ── Nav row ───────────────────────────────────────────────────────────────────
function NavRow({
  icon: Icon,
  label,
  sub,
  iconBg,
  iconColor,
  onClick,
}: {
  icon: React.ElementType
  label: string
  sub: string
  iconBg: string
  iconColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl hover:bg-teal-50/50 transition-all duration-150"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon className="w-[17px] h-[17px]" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold text-gray-800 leading-tight">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
    </button>
  )
}

// ── Setup grid button ─────────────────────────────────────────────────────────
function SetupBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 bg-white hover:border-teal-200 hover:bg-teal-50/40 transition-all duration-200"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: T.tealLight }}>
        <Icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-150" style={{ color: T.teal }} />
      </div>
      <p className="text-[10px] font-semibold text-gray-500 text-center leading-tight tracking-wide">{label}</p>
    </button>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-0.5 h-4 rounded-full" style={{ background: T.teal }} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100/80 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router         = useRouter()
  const { activeTerm } = useTermStore()
  const { data, isLoading, isError, refetch } = useDashboard()
  const [busy, setBusy] = useState<Action>(null)

  async function handleGenerate() {
    if (!activeTerm?.id) { toast.error('No active term'); return }
    setBusy('generate')
    try {
      await generateTimetable(activeTerm.id)
      toast.success('Timetable generated')
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Failed to generate')
    } finally { setBusy(null) }
  }

  async function handlePublish(force = false) {
    if (!activeTerm?.id) { toast.error('No active term'); return }
    setBusy('publish')
    try {
      await publishTimetable(activeTerm.id, force)
      toast.success('Drafts published')
      refetch()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400)      { toast.success('Already published'); refetch() }
      else if (status === 409) {
        const ok = window.confirm('High severity conflicts exist. Force-publish anyway?')
        if (ok) { setBusy(null); await handlePublish(true); return }
        else    toast.error('Resolve conflicts first')
      } else {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        toast.error(msg ?? 'Failed to publish')
      }
    } finally { setBusy(null) }
  }

  async function handleClear() {
    if (!activeTerm?.id) { toast.error('No active term'); return }
    if (!confirm('Delete all draft entries? This cannot be undone.')) return
    setBusy('clear')
    try {
      await deleteDrafts(activeTerm.id)
      toast.success('Drafts cleared')
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Failed to clear drafts')
    } finally { setBusy(null) }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/60 p-4 lg:p-8 space-y-4">
        <div className="h-52 rounded-2xl animate-pulse" style={{ background: T.teal }} />
        {[100, 80, 200].map((h, i) => (
          <div key={i} className="rounded-2xl bg-white animate-pulse border border-gray-100" style={{ height: h }} />
        ))}
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-800">Failed to load dashboard</p>
          <p className="text-sm text-gray-400 mt-1">Check your connection and try again</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: T.teal }}
        >
          Retry
        </button>
      </div>
    )
  }

  const { term, cohorts, trainers, rooms, programmes } = data
  const draftUnits       = term?.drafts             ?? 0
  const publishedUnits   = term?.published          ?? 0
  const scheduledUnits   = draftUnits + publishedUnits
  const pendingConflicts = term?.conflicts?.pending ?? 0
  const hasConflicts     = pendingConflicts > 0
  const canPublish       = draftUnits > 0 && !hasConflicts

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">

        {/* ── Hero card ── */}
        <HeroCard
          term={term}
          drafts={draftUnits}
          published={publishedUnits}
          scheduled={scheduledUnits}
        />

        {/* ── No active term warning ── */}
        {!term && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-800 flex-1">No active term selected.</p>
            <button
              onClick={() => router.push('/setup/terms')}
              className="text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
            >
              Set up →
            </button>
          </div>
        )}

        {/* ── Main grid: 3-col on lg ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* ── Left col: Stats + Status ── */}
          <div className="lg:col-span-2 space-y-5 lg:space-y-6">

            {/* Stats row */}
            <div>
              <SectionHeading title="Overview" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                <StatCard icon={GraduationCap} label="Cohorts"    value={cohorts    ?? 0} accent="#0d9488" />
                <StatCard icon={Users}         label="Trainers"   value={trainers   ?? 0} accent="#6366f1" />
                <StatCard icon={DoorOpen}      label="Rooms"      value={rooms      ?? 0} accent="#059669" />
                <StatCard icon={Layers}        label="Programmes" value={programmes ?? 0} accent="#f59e0b" />
              </div>
            </div>

            {/* Timetable status */}
            <div>
              <SectionHeading title="Timetable Status" />
              <Card className="p-5 space-y-5">
                <ProgressBar label="Published" value={publishedUnits} total={scheduledUnits} color={T.teal} />
                <ProgressBar label="Drafts"    value={draftUnits}     total={scheduledUnits} color="#f59e0b" />

                {hasConflicts ? (
                  <button
                    onClick={() => router.push('/conflicts')}
                    className="flex items-center gap-3 w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-left hover:bg-red-100 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-700 flex-1">
                      {pendingConflicts} conflict{pendingConflicts > 1 ? 's' : ''} require resolution
                    </p>
                    <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
                  </button>
                ) : scheduledUnits > 0 ? (
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: T.tealLight, border: `1px solid ${T.tealBorder}` }}>
                    <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: T.teal }} />
                    <p className="text-xs font-bold" style={{ color: T.tealDark }}>No conflicts — ready to publish</p>
                  </div>
                ) : null}
              </Card>
            </div>

            {/* Quick access */}
            <div>
              <SectionHeading title="Quick Access" />
              <Card className="divide-y divide-gray-50/80 overflow-hidden py-1">
                <NavRow
                  icon={LayoutGrid}
                  label="Master Timetable"
                  sub="Complete schedule overview"
                  iconBg={T.tealLight}
                  iconColor={T.teal}
                  onClick={() => router.push('/timetable')}
                />
                <NavRow
                  icon={GraduationCap}
                  label="By Cohort"
                  sub="Per-cohort timetable view"
                  iconBg="#eff6ff"
                  iconColor="#3b82f6"
                  onClick={() => router.push('/timetable/cohorts')}
                />
                <NavRow
                  icon={Users}
                  label="By Trainer"
                  sub="Individual trainer schedules"
                  iconBg="#f5f3ff"
                  iconColor="#7c3aed"
                  onClick={() => router.push('/timetable/trainers')}
                />
                <NavRow
                  icon={ShieldCheck}
                  label="Constraints"
                  sub="Manage scheduling rules"
                  iconBg="#fef2f2"
                  iconColor="#e11d48"
                  onClick={() => router.push('/constraints')}
                />
              </Card>
            </div>

          </div>

          {/* ── Right col: Actions + Setup ── */}
          <div className="space-y-5 lg:space-y-6">

            {/* Actions */}
            <div>
              <SectionHeading title="Actions" />
              <Card className="p-4 space-y-2.5">
                <ActionBtn
                  icon={Zap}
                  label="Generate Timetable"
                  description="Auto-schedule all units for this term"
                  onClick={handleGenerate}
                  loading={busy === 'generate'}
                  disabled={!!busy}
                  variant="primary"
                />
                <ActionBtn
                  icon={CheckCircle}
                  label="Publish Drafts"
                  description={
                    canPublish
                      ? `${draftUnits} draft${draftUnits > 1 ? 's' : ''} ready to publish`
                      : hasConflicts
                      ? 'Resolve conflicts before publishing'
                      : 'No drafts available to publish'
                  }
                  onClick={() => handlePublish()}
                  loading={busy === 'publish'}
                  disabled={!!busy || !canPublish}
                  variant="success"
                />
                {hasConflicts && (
                  <ActionBtn
                    icon={AlertTriangle}
                    label="Resolve Conflicts"
                    description={`${pendingConflicts} scheduling conflict${pendingConflicts > 1 ? 's' : ''} pending`}
                    onClick={() => router.push('/conflicts')}
                    variant="warning"
                  />
                )}
                {draftUnits > 0 && (
                  <ActionBtn
                    icon={Trash2}
                    label="Clear Drafts"
                    description="Permanently remove all draft entries"
                    onClick={handleClear}
                    loading={busy === 'clear'}
                    disabled={!!busy}
                    variant="danger"
                  />
                )}
              </Card>
            </div>

            {/* Setup */}
            <div>
              <SectionHeading title="Setup" />
              <div className="grid grid-cols-4 gap-2">
                {SETUP_LINKS.map(({ href, icon, label }) => (
                  <SetupBtn key={href} icon={icon} label={label} onClick={() => router.push(href)} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}