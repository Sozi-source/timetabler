import type { Term } from '@/types'

export default function TermProgress({ term }: { term: Term }) {
  const pct = term.teaching_weeks > 0
    ? Math.min(100, Math.round(
        ((term.teaching_weeks - term.weeks_remaining) / term.teaching_weeks) * 100
      ))
    : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active term</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{term.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{term.start_date} — {term.end_date}</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Week</p>
            <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{term.week_number}</p>
            <p className="text-xs text-gray-400">of {term.teaching_weeks}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining</p>
            <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{term.weeks_remaining}</p>
            <p className="text-xs text-gray-400">weeks</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Complete</p>
            <p className={`text-2xl font-bold mt-1 ${pct >= 100 ? 'text-emerald-600' : 'text-[#1e3a5f]'}`}>
              {pct}%
            </p>
          </div>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-700"
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