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
  size?: 'sm' | 'md'
}

const variants = {
  primary: 'bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-sm ring-1 ring-[#1e3a5f]/10',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm ring-1 ring-emerald-500/20',
  danger:  'bg-red-600 text-white hover:bg-red-700 shadow-sm ring-1 ring-red-500/20',
  ghost:   'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
}

export default function ActionButton({
  label, icon: Icon, onClick, loading, loadingLabel,
  variant = 'primary', disabled, size = 'md',
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center font-semibold rounded-xl transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f]/40',
        'active:scale-[.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
      )}
    >
      {loading
        ? <Loader2 className={size === 'sm' ? 'h-3 w-3 animate-spin' : 'h-4 w-4 animate-spin'} />
        : <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      }
      {loading ? (loadingLabel ?? label) : label}
    </button>
  )
}