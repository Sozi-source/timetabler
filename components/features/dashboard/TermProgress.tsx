import type { Term } from '@/types'

export default function TermProgress({ term }: { term: Term }) {
  const pct = term.teaching_weeks > 0
    ? Math.round(((term.teaching_weeks - term.weeks_remaining) / term.teaching_weeks) * 100)
    : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Term</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{term.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#1e3a5f]">Wk {term.week_number}</p>
          <p className="text-xs text-gray-400">{term.weeks_remaining}w remaining</p>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-gray-400">
        <span>{term.start_date}</span>
        <span>{pct}% complete</span>
        <span>{term.end_date}</span>
      </div>
    </div>
  )
}