'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Play, CheckCircle, Trash2, AlertTriangle, Loader2,
  Calendar, ChevronRight, BookOpen, Users, DoorOpen,
  TrendingUp, Clock, ShieldCheck, LayoutGrid, GraduationCap,
  Bell, Layers,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useTimetable'
import { useTermStore } from '@/store'
import { generateTimetable, publishTimetable, deleteDrafts } from '@/services/timetable'
import { toast } from 'sonner'
import HeroCard from '@/components/features/dashboard/HeroCard'

type Action = 'generate' | 'publish' | 'clear' | null

const GREEN   = '#0d9488'
const GREEN_L = '#f0fdfa'

// ── Quick action ──────────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon,
  label,
  bg,
  color,
  onClick,
  loading,
}: {
  icon: React.ElementType
  label: string
  bg: string
  color: string
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading} className="flex flex-col items-center gap-2 group">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95"
        style={{ background: bg }}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
        ) : (
          <Icon className="w-5 h-5" style={{ color }} />
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-500 text-center leading-tight">{label}</p>
    </button>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({
  icon: Icon,
  label,
  value,
  bg,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  bg: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-1 font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  )
}

// ── Progress row ──────────────────────────────────────────────────────────────
function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400 font-semibold">{label}</span>
        <span className="font-bold text-gray-700">
          {value} <span className="text-gray-400 font-normal">/ {total}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── Nav row ───────────────────────────────────────────────────────────────────
function NavRow({
  icon: Icon,
  label,
  sub,
  bg,
  color,
  onClick,
}: {
  icon: React.ElementType
  label: string
  sub: string
  bg: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-1 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold text-gray-800 leading-tight">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// ── Setup button ──────────────────────────────────────────────────────────────
function SetupBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/50 transition-all group"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors group-hover:bg-green-100"
        style={{ background: GREEN_L }}
      >
        <Icon className="w-4 h-4" style={{ color: GREEN }} />
      </div>
      <p className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{label}</p>
    </button>
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
  const map = {
    primary: { bg: GREEN,     text: '#fff',    iconBg: 'rgba(255,255,255,0.18)', border: GREEN     },
    success: { bg: '#059669', text: '#fff',    iconBg: 'rgba(255,255,255,0.18)', border: '#059669' },
    danger:  { bg: '#fef2f2', text: '#991b1b', iconBg: '#fee2e2',                border: '#fecaca' },
    warning: { bg: '#fffbeb', text: '#92400e', iconBg: '#fef3c7',                border: '#fde68a' },
  }
  const s = map[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-3 w-full rounded-2xl px-4 py-3.5 transition-all text-left disabled:opacity-40 min-h-[64px] active:scale-[0.98]"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: s.iconBg }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: s.text }} />
        ) : (
          <Icon className="w-4 h-4" style={{ color: s.text }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight" style={{ color: s.text }}>
          {label}
        </p>
        <p
          className="text-[11px] mt-0.5 leading-tight"
          style={{ color: s.text, opacity: 0.65 }}
        >
          {description}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: s.text, opacity: 0.4 }} />
    </button>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">
        {title}
      </p>
      {children}
    </div>
  )
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

// ── Sub-sections ──────────────────────────────────────────────────────────────

function MobileQuickActions({
  busy,
  hasConflicts,
  router,
  onGenerate,
  onPublish,
  onClear,
}: {
  busy: Action
  hasConflicts: boolean
  router: ReturnType<typeof useRouter>
  onGenerate: () => void
  onPublish: () => void
  onClear: () => void
}) {
  return (
    <Section title="Quick actions">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon={Play}
            label="Generate"
            bg="#e8f4ee"
            color={GREEN}
            onClick={onGenerate}
            loading={busy === 'generate'}
          />
          <QuickAction
            icon={CheckCircle}
            label="Publish"
            bg="#eff6ff"
            color="#1d4ed8"
            onClick={onPublish}
            loading={busy === 'publish'}
          />
          <QuickAction
            icon={AlertTriangle}
            label="Conflicts"
            bg="#fffbeb"
            color="#d97706"
            onClick={() => router.push('/conflicts')}
          />
          <QuickAction
            icon={Trash2}
            label="Clear"
            bg="#fef2f2"
            color="#b91c1c"
            onClick={onClear}
            loading={busy === 'clear'}
          />
        </div>
      </div>
    </Section>
  )
}

function DesktopActionCard({
  busy,
  hasConflicts,
  pendingConflicts,
  draftUnits,
  canPublish,
  router,
  onGenerate,
  onPublish,
  onClear,
}: {
  busy: Action
  hasConflicts: boolean
  pendingConflicts: number
  draftUnits: number
  canPublish: boolean
  router: ReturnType<typeof useRouter>
  onGenerate: () => void
  onPublish: () => void
  onClear: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Actions</p>
      <ActionBtn
        icon={Play}
        label="Generate Timetable"
        description="Auto-schedule all units for this term"
        onClick={onGenerate}
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
            : 'No drafts to publish'
        }
        onClick={onPublish}
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
          description="Permanently delete all draft entries"
          onClick={onClear}
          loading={busy === 'clear'}
          disabled={!!busy}
          variant="danger"
        />
      )}
    </div>
  )
}

function StatusSection({
  publishedUnits,
  draftUnits,
  scheduledUnits,
  hasConflicts,
  pendingConflicts,
  router,
}: {
  publishedUnits: number
  draftUnits: number
  scheduledUnits: number
  hasConflicts: boolean
  pendingConflicts: number
  router: ReturnType<typeof useRouter>
}) {
  return (
    <Section title="Timetable status">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-4">
        <ProgressRow label="Published" value={publishedUnits} total={scheduledUnits} color={GREEN}   />
        <ProgressRow label="Drafts"    value={draftUnits}     total={scheduledUnits} color="#d97706" />
        {hasConflicts ? (
          <button
            onClick={() => router.push('/conflicts')}
            className="flex items-center gap-3 w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-left hover:bg-red-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-bold text-red-700 flex-1">
              {pendingConflicts} conflict{pendingConflicts > 1 ? 's' : ''} need resolution
            </p>
            <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
          </button>
        ) : scheduledUnits > 0 ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs font-bold text-green-700">No conflicts — ready to publish</p>
          </div>
        ) : null}
      </div>
    </Section>
  )
}

function QuickAccessSection({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <Section title="Quick access">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-1 divide-y divide-gray-50">
        <NavRow
          icon={LayoutGrid}
          label="Master Timetable"
          sub="Full schedule view"
          bg="#e8f4ee"
          color={GREEN}
          onClick={() => router.push('/timetable')}
        />
        <NavRow
          icon={GraduationCap}
          label="By Cohort"
          sub="Per-cohort view"
          bg="#eff6ff"
          color="#1d4ed8"
          onClick={() => router.push('/timetable/cohorts')}
        />
        <NavRow
          icon={Users}
          label="By Trainer"
          sub="Per-trainer schedule"
          bg="#f5f3ff"
          color="#7c3aed"
          onClick={() => router.push('/timetable/trainers')}
        />
        <NavRow
          icon={ShieldCheck}
          label="Constraints"
          sub="Scheduling rules"
          bg="#fef2f2"
          color="#b91c1c"
          onClick={() => router.push('/constraints')}
        />
      </div>
    </Section>
  )
}

function SetupSection({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <Section title="Setup">
      <div className="grid grid-cols-4 gap-2.5">
        {SETUP_LINKS.map(({ href, icon, label }) => (
          <SetupBtn key={href} icon={icon} label={label} onClick={() => router.push(href)} />
        ))}
      </div>
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
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
    } catch { toast.error('Failed to generate') }
    finally { setBusy(null) }
  }

  async function handlePublish() {
    if (!activeTerm?.id) { toast.error('No active term'); return }
    setBusy('publish')
    try {
      await publishTimetable(activeTerm.id)
      toast.success('Drafts published')
      refetch()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400)      toast.success('Already published')
      else if (status === 409) toast.error('Resolve conflicts first')
      else                     toast.error('Failed to publish')
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
    } catch { toast.error('Failed to clear drafts') }
    finally { setBusy(null) }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="h-56 animate-pulse lg:rounded-2xl" style={{ background: GREEN }} />
        <div className="px-4 pt-5 space-y-4 max-w-screen-xl mx-auto lg:px-0">
          {[120, 80, 200, 160].map((h, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white animate-pulse border border-gray-100"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="dashboard-page min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-base font-bold text-gray-800">Failed to load dashboard</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">Check your connection and try again</p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: GREEN }}
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
    <div className="dashboard-page">
      <div className="lg:max-w-screen-xl lg:mx-auto lg:px-0">

        {/* On lg+: hero left, actions right (2-col) */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">

          {/* Left: hero card */}
          <div>
            <HeroCard
              term={term}
              drafts={draftUnits}
              published={publishedUnits}
              scheduled={scheduledUnits}
            />

            {/* No term warning */}
            {!term && (
              <div className="mx-4 mt-4 lg:mx-0 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-amber-800 flex-1">No active term.</p>
                <button
                  onClick={() => router.push('/setup/terms')}
                  className="text-xs font-bold underline underline-offset-2 text-amber-700"
                >
                  Set up →
                </button>
              </div>
            )}

            {/* Mobile/tablet: stacked sections */}
            <div className="px-4 pt-6 space-y-6 lg:hidden">
              <MobileQuickActions
                busy={busy}
                hasConflicts={hasConflicts}
                router={router}
                onGenerate={handleGenerate}
                onPublish={handlePublish}
                onClear={handleClear}
              />
              <StatusSection
                publishedUnits={publishedUnits}
                draftUnits={draftUnits}
                scheduledUnits={scheduledUnits}
                hasConflicts={hasConflicts}
                pendingConflicts={pendingConflicts}
                router={router}
              />
              <Section title="Overview">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile icon={GraduationCap} label="Cohorts"    value={cohorts    ?? 0} bg="#eff6ff" color="#1d4ed8" />
                  <StatTile icon={Users}         label="Trainers"   value={trainers   ?? 0} bg="#f5f3ff" color="#7c3aed" />
                  <StatTile icon={DoorOpen}      label="Rooms"      value={rooms      ?? 0} bg="#ecfdf5" color="#059669" />
                  <StatTile icon={Layers}        label="Programmes" value={programmes ?? 0} bg="#fffbeb" color="#d97706" />
                </div>
              </Section>
              <QuickAccessSection router={router} />
              <SetupSection router={router} />
            </div>
          </div>

          {/* Desktop right column: actions + status */}
          <div className="hidden lg:flex lg:flex-col lg:gap-6 lg:pt-0">
            <DesktopActionCard
              busy={busy}
              hasConflicts={hasConflicts}
              pendingConflicts={pendingConflicts}
              draftUnits={draftUnits}
              canPublish={canPublish}
              router={router}
              onGenerate={handleGenerate}
              onPublish={handlePublish}
              onClear={handleClear}
            />
          </div>

        </div>

        {/* Desktop: full-width sections below the 2-col hero */}
        <div className="hidden lg:block lg:pt-6 lg:space-y-6">

          {/* Status + Stats side by side */}
          <div className="grid grid-cols-[1fr_1fr] gap-6">
            <StatusSection
              publishedUnits={publishedUnits}
              draftUnits={draftUnits}
              scheduledUnits={scheduledUnits}
              hasConflicts={hasConflicts}
              pendingConflicts={pendingConflicts}
              router={router}
            />
            <Section title="Overview">
              <div className="grid grid-cols-2 gap-3">
                <StatTile icon={GraduationCap} label="Cohorts"    value={cohorts    ?? 0} bg="#eff6ff" color="#1d4ed8" />
                <StatTile icon={Users}         label="Trainers"   value={trainers   ?? 0} bg="#f5f3ff" color="#7c3aed" />
                <StatTile icon={DoorOpen}      label="Rooms"      value={rooms      ?? 0} bg="#ecfdf5" color="#059669" />
                <StatTile icon={Layers}        label="Programmes" value={programmes ?? 0} bg="#fffbeb" color="#d97706" />
              </div>
            </Section>
          </div>

          {/* Quick access + Setup side by side */}
          <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
            <QuickAccessSection router={router} />
            <div className="w-[340px]">
              <SetupSection router={router} />
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}