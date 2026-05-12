'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, ArrowRight, BookOpen, CheckCircle2, Clock,
  CalendarDays, TrendingUp, Layers, AlertCircle,
} from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  // Gradient: starts bright teal-400, transitions through teal-500, ends teal-600 — never deep
  gradFrom:    '#2dd4bf',   // teal-400  — bright, fresh top-left
  gradMid:     '#14b8a6',   // teal-500  — mid
  gradTo:      '#0d9488',   // teal-600  — grounded base, not dark

  teal:        '#0d9488',
  tealDark:    '#0f766e',
  tealDeep:    '#134e4a',
  white:       '#ffffff',

  // Glass layers
  glass10:     'rgba(255,255,255,0.10)',
  glass14:     'rgba(255,255,255,0.14)',
  glass18:     'rgba(255,255,255,0.18)',
  glass22:     'rgba(255,255,255,0.22)',
  glass28:     'rgba(255,255,255,0.28)',

  // Text on teal
  textPrimary: 'rgba(255,255,255,1.00)',
  textSecond:  'rgba(255,255,255,0.88)',
  textMuted:   'rgba(255,255,255,0.72)',

  // Semantic chips
  emerald:     'rgba(52,211,153,0.22)',
  emeraldBrd:  'rgba(52,211,153,0.38)',
  emeraldDot:  '#34d399',
  amber:       'rgba(251,191,36,0.20)',
  amberBrd:    'rgba(251,191,36,0.34)',
  amberDot:    '#fbbf24',
  slate:       'rgba(148,163,184,0.18)',
  slateBrd:    'rgba(148,163,184,0.28)',
  slateDot:    '#94a3b8',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Progress arc ───────────────────────────────────────────────────────────────
function ProgressArc({ pct, size = 80 }: { pct: number; size?: number }) {
  const strokeW = 5.5
  const r    = (size - strokeW * 2) / 2
  const cx   = size / 2
  const cy   = size / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${Math.round(pct)}% complete`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={strokeW} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="white" fontFamily="'DM Sans', sans-serif">
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="6" fontWeight="700" fill="rgba(255,255,255,0.72)" letterSpacing="0.09em" fontFamily="'DM Sans', sans-serif">
        COMPLETE
      </text>
    </svg>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'active' | 'upcoming' | 'completed' }) {
  const map = {
    active:    { label: 'Active',    bg: T.emerald, border: T.emeraldBrd, dot: T.emeraldDot },
    upcoming:  { label: 'Upcoming',  bg: T.amber,   border: T.amberBrd,   dot: T.amberDot   },
    completed: { label: 'Completed', bg: T.slate,   border: T.slateBrd,   dot: T.slateDot   },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-2 py-[3px] text-[9px] font-black text-white uppercase tracking-[0.11em]"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Stat cell ──────────────────────────────────────────────────────────────────
function StatCell({
  icon: Icon, iconBg, value, label,
}: {
  icon: React.ElementType; iconBg: string; value: number; label: string
}) {
  return (
    <div
      className="flex flex-col rounded-[14px] px-3 pt-3 pb-2.5 gap-2"
      style={{ background: T.glass10, border: `1px solid ${T.glass18}` }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="h-[13px] w-[13px] text-white" strokeWidth={2.2} />
        </div>
        <span
          className="text-[22px] font-bold tabular-nums leading-none"
          style={{ color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}
        >
          {value}
        </span>
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.10em]" style={{ color: T.textMuted }}>
        {label}
      </p>
    </div>
  )
}

// ── Chip ───────────────────────────────────────────────────────────────────────
function Chip({
  icon: Icon, children, variant = 'default',
}: {
  icon: React.ElementType; children: React.ReactNode; variant?: 'default' | 'amber' | 'muted'
}) {
  const styles = {
    default: { bg: T.glass14, border: T.glass22 },
    amber:   { bg: T.amber,   border: T.amberBrd },
    muted:   { bg: 'rgba(255,255,255,0.07)', border: T.glass14 },
  }
  const s = styles[variant]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[4px] text-[11px] font-semibold text-white"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="h-[11px] w-[11px] shrink-0 opacity-80" strokeWidth={2.2} />
      {children}
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface HeroCardProps {
  term: {
    name: string
    start_date?: string
    end_date?: string
    progress_pct?: number
    current_week?: number
    total_weeks?: number
    weeks_remaining?: number
    days_remaining?: number
    days_elapsed?: number
    total_days?: number
    status?: 'active' | 'upcoming' | 'completed'
    week_number?: number
    teaching_weeks?: number
  } | null
  drafts: number
  published: number
  scheduled: number
}

// ── HeroCard ───────────────────────────────────────────────────────────────────
export default function HeroCard({ term, drafts, published, scheduled }: HeroCardProps) {
  const router = useRouter()

  const pct         = term?.progress_pct    ?? 0
  const week        = term?.current_week    ?? term?.week_number    ?? 0
  const totalWeeks  = term?.total_weeks     ?? term?.teaching_weeks ?? 0
  const weeksLeft   = term?.weeks_remaining ?? 0
  const daysLeft    = term?.days_remaining  ?? 0
  const totalDays   = term?.total_days      ?? 0
  const daysElapsed = term?.days_elapsed    ?? 0
  const termStatus  = term?.status          ?? 'active'

  return (
    <section
      aria-label="Term overview"
      className="relative overflow-hidden w-full sm:rounded-[22px]"
      style={{
        // Bright teal-400 → teal-500 → teal-600 — vibrant, never muddy
        background: `linear-gradient(140deg, ${T.gradFrom} 0%, ${T.gradMid} 45%, ${T.gradTo} 100%)`,
      }}
    >
      {/* ── Atmospheric orbs ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-[280px] w-[280px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-12 h-[200px] w-[200px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 65%)' }}
      />
      {/* Grain texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* ── Content ── */}
      <div className="relative px-5 pt-5 pb-5 sm:px-6 sm:pt-5 sm:pb-6 flex flex-col gap-4">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
              style={{ background: T.glass18, border: `1px solid ${T.glass22}` }}
            >
              <CalendarDays className="h-[14px] w-[14px] text-white opacity-80" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>
              Timetable Admin
            </span>
          </div>

          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-[10px] text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: T.glass14, border: `1px solid ${T.glass22}` }}
            aria-label="Notifications"
          >
            <Bell className="h-[15px] w-[15px]" strokeWidth={2} />
            <span
              aria-hidden
              className="absolute top-[7px] right-[7px] h-[6px] w-[6px] rounded-full"
              style={{ background: T.amberDot, border: '1.5px solid #14b8a6' }}
            />
          </button>
        </div>

        {/* Term name + arc */}
        {term ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.13em]" style={{ color: T.textMuted }}>
                  Active term
                </span>
                <StatusBadge status={termStatus} />
              </div>

              <h1
                className="text-[23px] font-bold leading-[1.12] tracking-[-0.02em] truncate mb-1"
                style={{ color: T.textPrimary, fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {term.name}
              </h1>

              {term.start_date && term.end_date && (
                <p className="text-[11px] font-medium mb-3" style={{ color: T.textMuted }}>
                  {fmt(term.start_date)} — {fmt(term.end_date)}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <Chip icon={Clock} variant="default">Week {week || '—'} / {Math.round(totalWeeks) || '—'}</Chip>
                {termStatus === 'active' && daysLeft > 0 && (
                  <Chip icon={TrendingUp} variant="amber">{daysLeft}d · {weeksLeft}w left</Chip>
                )}
                {termStatus === 'upcoming' && term.start_date && (
                  <Chip icon={AlertCircle} variant="amber">Starts {fmt(term.start_date)}</Chip>
                )}
                {termStatus === 'completed' && (
                  <Chip icon={CheckCircle2} variant="muted">Term ended</Chip>
                )}
              </div>
            </div>

            {totalWeeks > 0 && (
              <div className="hidden sm:flex shrink-0">
                <ProgressArc pct={pct} size={80} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.13em] mb-1.5" style={{ color: T.textMuted }}>
              No active term
            </p>
            <h1
              className="text-[22px] font-bold leading-[1.15] tracking-[-0.02em] mb-4"
              style={{ color: 'rgba(255,255,255,0.82)', fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Set up a term to begin
            </h1>
            <button
              onClick={() => router.push('/setup/terms')}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: T.glass18, border: `1px solid ${T.glass22}` }}
            >
              Go to Terms <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Progress bar */}
        {term && totalDays > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>
                Term progress
              </span>
              <span className="text-[10px] font-medium tabular-nums" style={{ color: T.textMuted }}>
                {daysElapsed}d elapsed · {daysLeft}d remaining
              </span>
            </div>
            <div className="relative h-[4px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: termStatus === 'completed' ? 'rgba(52,211,153,0.88)' : 'rgba(255,255,255,0.85)',
                }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.20)' }} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCell icon={Layers}      iconBg={T.glass28}                   value={drafts}    label="Drafts"     />
          <StatCell icon={CheckCircle2} iconBg="rgba(52,211,153,0.30)"      value={published} label="Published"  />
          <StatCell icon={Clock}        iconBg="rgba(251,191,36,0.30)"      value={scheduled} label="Scheduled"  />
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/timetable')}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] py-[11px] px-4 text-[13px] font-bold tracking-[-0.01em] transition-all hover:opacity-92 hover:-translate-y-[1px] active:scale-[.98]"
            style={{ background: 'white', color: T.teal }}
          >
            <BookOpen className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />
            View Timetable
          </button>
          <button
            onClick={() => router.push('/setup/term_units')}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] py-[11px] px-4 text-[13px] font-bold text-white tracking-[-0.01em] transition-all hover:-translate-y-[1px] active:scale-[.98]"
            style={{ background: T.glass14, border: `1px solid ${T.glass22}` }}
            onMouseEnter={e => (e.currentTarget.style.background = T.glass22)}
            onMouseLeave={e => (e.currentTarget.style.background = T.glass14)}
          >
            Assign Units
            <ArrowRight className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </section>
  )
}