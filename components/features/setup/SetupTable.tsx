'use client'

import { Pencil, Trash2, Loader2 } from 'lucide-react'

export interface ColDef<T> {
  header: string
  render: (row: T) => React.ReactNode
  width?: string
}

interface SetupTableProps<T extends { id: string }> {
  cols: ColDef<T>[]
  rows: T[]
  loading?: boolean
  deletingId?: string | null
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  emptyIcon?: React.ReactNode
  emptyMsg?: string
  emptySub?: string
  onEmptyAdd?: () => void
}

export default function SetupTable<T extends { id: string }>({
  cols, rows, loading, deletingId, onEdit, onDelete,
  emptyIcon, emptyMsg = 'Nothing here yet', emptySub, onEmptyAdd,
}: SetupTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
        {emptyIcon && <div className="flex justify-center mb-3 text-gray-200">{emptyIcon}</div>}
        <p className="text-sm font-medium text-gray-500">{emptyMsg}</p>
        {emptySub && <p className="text-xs text-gray-400 mt-1">{emptySub}</p>}
        {onEmptyAdd && (
          <button
            onClick={onEmptyAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"
          >
            Add first record
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            {cols.map(c => (
              <th key={c.header} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={c.width ? { width: c.width } : {}}>
                {c.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3 w-20" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {cols.map(c => (
                <td key={c.header} className="px-4 py-3 text-gray-800">{c.render(row)}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button onClick={() => onEdit(row)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(row)} disabled={deletingId === row.id} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors" title="Delete">
                        {deletingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
