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
  default: 'bg-slate-100 text-[#1e3a5f]',
  amber:   'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  red:     'bg-red-100 text-red-700',
  blue:    'bg-blue-100 text-blue-700',
}

export default function StatCard({
  label, value, icon: Icon, accent = 'default', badge, sub,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-start gap-4">
      <div className={cn('rounded-lg p-2.5 shrink-0', accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', accents[accent])}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
