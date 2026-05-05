'use client'

interface TimetableStatusProps {
  scheduled: number
  published: number
  drafts: number
  conflicts: number
  onViewMaster: () => void
}

interface StatusCell {
  label: string
  value: number
  valueColor: string
  barColor: string
}

export default function TimetableStatus({
  scheduled,
  published,
  drafts,
  conflicts,
  onViewMaster,
}: TimetableStatusProps) {
  const cells: StatusCell[] = [
    {
      label: 'Scheduled',
      value: scheduled,
      valueColor: '#111827',
      barColor: '#e5e7eb',
    },
    {
      label: 'Published',
      value: published,
      valueColor: '#059669',
      barColor: '#10b981',
    },
    {
      label: 'Draft',
      value: drafts,
      valueColor: '#d97706',
      barColor: '#f59e0b',
    },
    {
      label: 'Conflicts',
      value: conflicts,
      valueColor: conflicts > 0 ? '#ef4444' : '#111827',
      barColor: conflicts > 0 ? '#ef4444' : '#e5e7eb',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: '#374151' }}
        >
          Timetable status
        </p>
        <button
          onClick={onViewMaster}
          className="text-[11px] font-medium"
          style={{ color: '#3b82f6', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          Master view →
        </button>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-2xl bg-white p-3.5"
            style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
          >
            <p
              className="font-display text-[26px] font-bold leading-none tabular-nums tracking-tight"
              style={{ color: cell.valueColor }}
            >
              {cell.value}
            </p>
            <p
              className="mt-1 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: '#9ca3af' }}
            >
              {cell.label}
            </p>
            <div
              className="mt-2.5 h-[3px] w-6 rounded-full"
              style={{ background: cell.barColor }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}