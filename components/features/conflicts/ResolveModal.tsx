'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import type { Conflict } from '@/types'
import { resolveConflict } from '@/services/timetable'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

type ResolutionMethod = 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED'

const METHOD_OPTS: { value: ResolutionMethod; label: string; desc: string }[] = [
  { value: 'RESOLVED',   label: 'Resolved',   desc: 'Conflict has been genuinely fixed' },
  { value: 'OVERRIDDEN', label: 'Overridden',  desc: 'Accepted with a known reason' },
  { value: 'IGNORED',    label: 'Ignored',     desc: 'Will not affect publishing' },
]

interface Props {
  conflict: Conflict | null
  termId: string
  onClose: () => void
}

export default function ResolveModal({ conflict, termId, onClose }: Props) {
  const qc = useQueryClient()
  const [method, setMethod] = useState<ResolutionMethod>('RESOLVED')
  const [note,   setNote]   = useState('')

  const mutation = useMutation({
    mutationFn: () => resolveConflict(conflict!.id, note, method),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success('Conflict resolved')
        qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) })
        qc.invalidateQueries({ queryKey: queryKeys.dashboard })
        onClose()
      } else {
        toast.error(res.error ?? 'Could not resolve conflict')
      }
    },
    onError: () => toast.error('Network error'),
  })

  if (!conflict) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Resolve Conflict</p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">{conflict.conflict_type}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Conflict description */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
            {conflict.description}
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Resolution method</label>
            <div className="space-y-2">
              {METHOD_OPTS.map(opt => (
                <label
                  key={opt.value}
                  className={
                    'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ' +
                    (method === opt.value
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-gray-200 hover:bg-gray-50')
                  }
                >
                  <input
                    type="radio"
                    name="method"
                    value={opt.value}
                    checked={method === opt.value}
                    onChange={() => setMethod(opt.value)}
                    className="mt-0.5 accent-[#1e3a5f]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Explain how this was resolved..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60 transition-colors"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark as {METHOD_OPTS.find(m => m.value === method)?.label}
          </button>
        </div>

      </div>
    </div>
  )
}
