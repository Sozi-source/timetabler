'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, ArrowRight, BookOpen, CheckCircle2, Clock,
  CalendarDays, TrendingUp, Layers, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Design tokens ──────────────────────────────────────────────────────────────
const TEAL_700  = '#0f766e'
const TEAL_600  = '#0d9488'
const TEAL_500  = '#14b8a6'
const TEAL_400  = '#2dd4bf'
const TEAL_300  = '#5eead4'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Progress arc (date-based) ──────────────────────────────────────────────────
function ProgressArc({
  pct, week, totalWeeks, size = 80,
}: {
  pct: number; week: number; totalWeeks: number; size?: number
}) {
  const r    = (size - 10) / 2
  const cx   = size / 2
  const cy   = size / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={5} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.90)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="white">
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7.5" fontWeight="500"
        fill="rgba(255,255,255,0.65)" letterSpacing="0.08em">
        WK {week}/{totalWeeks}
      </text>
    </svg>
  )
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon, label, value, accent,
}: {
  icon: React.ElementType; label: string; value: number; accent: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-white/15 backdrop-blur-sm px-3.5 py-2.5 border border-white/20 hover:bg-white/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: accent }}>
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        </div>
        <span className="text-2xl font-bold text-white tabular-nums leading-none">{value}</span>
      </div>
      <p className="text-[11px] font-semibold text-white/70 tracking-wide uppercase leading-none">
        {label}
      </p>
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'active' | 'upcoming' | 'completed' }) {
  const map = {
    active:    { label: 'Active',    bg: 'rgba(52,211,153,0.25)', dot: '#34d399' },
    upcoming:  { label: 'Upcoming',  bg: 'rgba(251,191,36,0.25)', dot: '#fbbf24' },
    completed: { label: 'Completed', bg: 'rgba(148,163,184,0.20)', dot: '#94a3b8' },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest border border-white/20"
      style={{ background: s.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Main HeroCard ──────────────────────────────────────────────────────────────
interface HeroCardProps {
  term: {
    name: string
    start_date?: string
    end_date?: string
    // Accurate date-derived fields (from updated _term_dict)
    progress_pct?: number
    current_week?: number
    total_weeks?: number
    weeks_remaining?: number
    days_remaining?: number
    days_elapsed?: number
    total_days?: number
    status?: 'active' | 'upcoming' | 'completed'
    // Fallback legacy fields
    week_number?: number
    teaching_weeks?: number
  } | null
  drafts: number
  published: number
  scheduled: number
}

export default function HeroCard({ term, drafts, published, scheduled }: HeroCardProps) {
  const router = useRouter()

  // Prefer new accurate fields, fall back to legacy
  const pct           = term?.progress_pct    ?? 0
  const week          = term?.current_week    ?? term?.week_number     ?? 0
  const totalWeeks    = term?.total_weeks     ?? term?.teaching_weeks  ?? 0
  const weeksLeft     = term?.weeks_remaining ?? 0
  const daysLeft      = term?.days_remaining  ?? 0
  const totalDays     = term?.total_days      ?? 0
  const daysElapsed   = term?.days_elapsed    ?? 0
  const termStatus    = term?.status          ?? 'active'

  return (
    <section
      aria-label="Term overview"
      className={cn(
        'relative overflow-hidden',
        'mx-0 sm:mx-4 lg:mx-0',
        'rounded-none sm:rounded-3xl lg:rounded-3xl',
      )}
      style={{
        background: `
          radial-gradient(ellipse at 110% -10%, ${TEAL_300}60 0%, transparent 55%),
          radial-gradient(ellipse at -10% 110%, ${TEAL_600} 0%, ${TEAL_500} 50%, ${TEAL_400} 100%)
        `,
      }}
    >
      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glow orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${TEAL_300}40` }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.12)' }} />

      {/* Content */}
      <div className="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 lg:px-8 lg:pt-6 lg:pb-5">

        {/* Top row */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.20)' }}>
              <CalendarDays className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">
              Timetable Admin
            </span>
          </div>
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-sm text-white transition-all hover:bg-white/25 active:scale-95"
            aria-label="View notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-300 ring-1 ring-teal-500" aria-hidden />
          </button>
        </div>

        {/* Main content */}
        <div className="flex items-center justify-between gap-6 mb-4 sm:mb-5">
          <div className="min-w-0 flex-1">
            {term ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
                    Active term
                  </p>
                  <StatusBadge status={termStatus} />
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                  {term.name}
                </h1>

                {/* Date range */}
                {term.start_date && term.end_date && (
                  <p className="text-[11px] text-white/50 mb-2.5 font-medium">
                    {fmt(term.start_date)} → {fmt(term.end_date)}
                  </p>
                )}

                {/* Progress bar — mobile only */}
                <div className="sm:hidden mb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60 font-medium">Term progress</span>
                    <span className="text-xs font-bold text-white">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-white"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {daysLeft > 0 && (
                    <p className="text-[10px] text-white/50 mt-1">{daysLeft} days remaining</p>
                  )}
                </div>

                {/* Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                    <Clock className="h-2.5 w-2.5" />
                    Week {week || '—'} of {Math.round(totalWeeks) || '—'}
                  </span>
                  {termStatus === 'active' && daysLeft > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 text-white">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {daysLeft}d · {weeksLeft}w left
                    </span>
                  )}
                  {termStatus === 'upcoming' && term.start_date && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-400/25 text-white border border-white/20">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Starts {fmt(term.start_date)}
                    </span>
                  )}
                  {termStatus === 'completed' && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/15 text-white border border-white/20">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Term ended
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">
                  No active term
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-white/70 leading-tight tracking-tight mb-2.5">
                  Set up a term to begin
                </h1>
                <button
                  onClick={() => router.push('/setup/terms')}
                  className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-3.5 py-1.5 transition-all active:scale-95 bg-white/20 text-white hover:bg-white/30"
                >
                  Go to Terms <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Arc — sm+ only */}
          {term && totalWeeks > 0 && (
            <div className="hidden sm:block shrink-0">
              <ProgressArc pct={pct} week={week} totalWeeks={Math.round(totalWeeks)} size={76} />
            </div>
          )}
        </div>

        {/* ── Full progress bar (sm+) ── */}
        {term && totalDays > 0 && (
          <div className="hidden sm:block mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">
                Term progress
              </span>
              <span className="text-[10px] text-white/60 font-medium">
                {daysElapsed}d elapsed · {daysLeft}d remaining · {totalDays}d total
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: termStatus === 'completed'
                    ? 'rgba(52,211,153,0.9)'
                    : 'rgba(255,255,255,0.9)',
                }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mb-3 sm:mb-4 h-px bg-white/15" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
          <StatPill icon={Layers}       label="Drafts"     value={drafts}    accent="rgba(255,255,255,0.20)" />
          <StatPill icon={CheckCircle2} label="Published"  value={published} accent="rgba(255,255,255,0.30)" />
          <StatPill icon={Clock}        label="Scheduled"  value={scheduled} accent="rgba(251,191,36,0.35)"  />
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/timetable')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold transition-all active:scale-[.98]"
            style={{ background: 'white', color: TEAL_700, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            View Timetable
          </button>
          <button
            onClick={() => router.push('/setup/term_units')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold border border-white/30 bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-[.98]"
          >
            Assign Units
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>

      </div>
    </section>
  )
}