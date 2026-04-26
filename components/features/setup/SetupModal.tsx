'use client'

import { X, Loader2 } from 'lucide-react'

interface SetupModalProps {
  open: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saving?: boolean
  saveLabel?: string
  valid?: boolean
  children: React.ReactNode
}

export default function SetupModal({ open, title, onClose, onSave, saving, saveLabel = 'Save', valid = true, children }: SetupModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">{children}</div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4 shrink-0">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={saving || !valid} className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
