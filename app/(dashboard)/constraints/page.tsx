'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConstraints } from '@/hooks/useSetup'
import { queryKeys } from '@/types'
import type { Constraint, ConstraintScope } from '@/types'
import { deleteConstraint } from '@/services/setup'
import ConstraintModal from '@/components/features/constraints/ConstraintModal'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const SCOPE_BADGE: Record<ConstraintScope, string> = {
  UNIT: 'bg-slate-100 text-slate-700',
  TRAINER:     'bg-blue-100 text-blue-700',
  COHORT:      'bg-violet-100 text-violet-700',
  ROOM:        'bg-teal-100 text-teal-700',
}

export default function ConstraintsPage() {
  const qc = useQueryClient()
  const { data: constraints = [], isLoading } = useConstraints()

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Constraint | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConstraint(id),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success('Constraint deleted')
        qc.invalidateQueries({ queryKey: queryKeys.constraints })
      } else {
        toast.error(res.error ?? 'Delete failed')
      }
      setDeletingId(null)
    },
    onError: () => { toast.error('Network error'); setDeletingId(null) },
  })

  function handleDelete(c: Constraint) {
    if (!confirm(`Delete constraint "${c.notes}"? This cannot be undone.`)) return
    setDeletingId(c.id)
    deleteMutation.mutate(c.id)
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Constraint) { setEditing(c); setModalOpen(true) }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Constraints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add constraint
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && constraints.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <ShieldCheck className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No constraints defined yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a constraint to restrict timetable generation</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add first constraint
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && constraints.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rule</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {constraints.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.notes}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', SCOPE_BADGE[c.scope])}>
                      {c.scope.charAt(0) + c.scope.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <code className="text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5 truncate block">
                      {typeof c.rule === 'string' ? c.rule : JSON.stringify(c.rule)}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      c.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                    )} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        {deletingId === c.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <ConstraintModal
        constraint={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
