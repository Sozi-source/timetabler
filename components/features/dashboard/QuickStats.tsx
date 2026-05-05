'use client'

import { Users, UserCheck, DoorOpen } from 'lucide-react'

interface QuickStatsProps {
  cohorts: number
  trainers: number
  rooms: number
}

const STATS = [
  {
    key: 'cohorts' as const,
    label: 'Cohorts',
    icon: Users,
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
  },
  {
    key: 'trainers' as const,
    label: 'Trainers',
    icon: UserCheck,
    iconBg: '#ecfdf5',
    iconColor: '#059669',
  },
  {
    key: 'rooms' as const,
    label: 'Rooms',
    icon: DoorOpen,
    iconBg: '#fffbeb',
    iconColor: '#d97706',
  },
]

export default function QuickStats({ cohorts, trainers, rooms }: QuickStatsProps) {
  const values = { cohorts, trainers, rooms }

  return (
    <div className="grid grid-cols-3 gap-2">
      {STATS.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
        <div
          key={key}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white py-3.5 px-1 min-w-0 overflow-hidden"
          style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ background: iconBg }}
          >
            <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
          </div>
          <span
            className="font-display text-[19px] sm:text-[22px] font-bold leading-none tabular-nums tracking-tight"
            style={{ color: '#111827' }}
          >
            {values[key]}
          </span>
          <span
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ color: '#9ca3af' }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}