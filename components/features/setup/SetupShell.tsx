'use client'

import { Plus } from 'lucide-react'

interface SetupShellProps {
  title: string
  subtitle?: string
  onAdd?: () => void
  addLabel?: string
  children: React.ReactNode
}

export default function SetupShell({ title, subtitle, onAdd, addLabel = 'Add', children }: SetupShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4" />{addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
