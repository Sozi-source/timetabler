'use client'

import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonProps {
  label: string
  icon: LucideIcon
  onClick: () => void
  loading?: boolean
  loadingLabel?: string
  variant?: 'primary' | 'success' | 'danger' | 'ghost'
  disabled?: boolean
}

const variants = {
  primary: 'bg-[#1e3a5f] text-white hover:bg-[#162d4a]',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger:  'bg-red-600 text-white hover:bg-red-700',
  ghost:   'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
}

export default function ActionButton({
  label, icon: Icon, onClick, loading, loadingLabel, variant = 'primary', disabled,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant]
      )}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Icon className="h-4 w-4" />
      }
      {loading ? (loadingLabel ?? label) : label}
    </button>
  )
}
