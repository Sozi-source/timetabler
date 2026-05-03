import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: 'default' | 'amber' | 'emerald' | 'red' | 'blue'
  badge?: string
  sub?: string
}

const accents = {
  default: { icon: 'bg-slate-100 text-[#1e3a5f]',  bar: 'bg-[#1e3a5f]' },
  amber:   { icon: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  red:     { icon: 'bg-red-100 text-red-700',       bar: 'bg-red-500' },
  blue:    { icon: 'bg-blue-100 text-blue-700',     bar: 'bg-blue-500' },
}

export default function StatCard({
  label, value, icon: Icon, accent = 'default', badge, sub,
}: StatCardProps) {
  const a = accents[accent]
  return (
    <div className="stat-card group">
      {/* Icon */}
      <div className={cn('rounded-xl p-2.5 shrink-0 transition-transform group-hover:scale-110', a.icon)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">{value}</span>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', a.icon)}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>}
      </div>

      {/* Accent bar — visible on hover via CSS */}
    </div>
  )
}
