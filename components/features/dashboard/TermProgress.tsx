import type { DashboardData } from '@/types'

type DashboardTerm = NonNullable<DashboardData['term']>

export default function TermProgress({ term }: { term: DashboardTerm }) {
  const weekNum = term.current_week ?? term.week_number ?? 0
  const totalWeeks = term.teaching_weeks ?? 0

  // Prefer backend-calculated pct; fall back to week-based calculation
  const pct: number = (() => {
    if ((term as any).progress_pct != null) return Math.round((term as any).progress_pct)
    if (totalWeeks > 0) return Math.min(100, Math.round((weekNum / totalWeeks) * 100))
    return 0
  })()

  const weeksRemaining = term.weeks_remaining ?? Math.max(0, totalWeeks - weekNum)
  const isComplete = pct >= 100

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active term</p>
          <p className="mt-1.5 text-lg font-bold text-gray-900 leading-tight">{term.name}</p>
          {term.start_date && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {term.start_date} — {term.end_date}
            </p>
          )}
        </div>

        {/* Stats cluster */}
        <div className="flex gap-5 sm:gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week</p>
            <p className="text-2xl font-bold text-[#1e3a5f] mt-1 tabular-nums leading-none">{weekNum}</p>
            <p className="text-xs text-gray-400 mt-0.5">of {totalWeeks}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remaining</p>
            <p className="text-2xl font-bold text-[#1e3a5f] mt-1 tabular-nums leading-none">{weeksRemaining}</p>
            <p className="text-xs text-gray-400 mt-0.5">weeks</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Complete</p>
            <p className={[
              'text-2xl font-bold mt-1 tabular-nums leading-none',
              isComplete ? 'text-emerald-600' : 'text-[#1e3a5f]',
            ].join(' ')}>
              {pct}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-all duration-700',
            isComplete ? 'bg-emerald-500' : 'bg-amber-400',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Date labels */}
      <div className="mt-2 flex justify-between text-[10px] text-gray-400 font-mono">
        <span>{term.start_date ?? ''}</span>
        <span className={isComplete ? 'text-emerald-600 font-bold' : 'font-medium text-gray-500'}>
          {pct}% complete
        </span>
        <span>{term.end_date ?? ''}</span>
      </div>
    </div>
  )
}