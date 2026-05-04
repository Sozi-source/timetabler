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
  default: {
    icon:  'bg-[#1e3a5f]/8 text-[#1e3a5f] ring-1 ring-[#1e3a5f]/10',
    badge: 'bg-[#1e3a5f]/8 text-[#1e3a5f]',
    bar:   'bg-[#1e3a5f]',
  },
  amber: {
    icon:  'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    bar:   'bg-amber-500',
  },
  emerald: {
    icon:  'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    bar:   'bg-emerald-500',
  },
  red: {
    icon:  'bg-red-100 text-red-700 ring-1 ring-red-200',
    badge: 'bg-red-100 text-red-700',
    bar:   'bg-red-500',
  },
  blue: {
    icon:  'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    bar:   'bg-blue-500',
  },
}

export default function StatCard({
  label, value, icon: Icon, accent = 'default', badge, sub,
}: StatCardProps) {
  const a = accents[accent]
  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Icon chip */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
        a.icon,
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', a.badge)}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="mt-1 text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}