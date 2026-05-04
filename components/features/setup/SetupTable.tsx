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
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center">
        {emptyIcon && (
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
              {emptyIcon}
            </div>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-500">{emptyMsg}</p>
        {emptySub && <p className="text-xs text-gray-400 mt-1">{emptySub}</p>}
        {onEmptyAdd && (
          <button
            onClick={onEmptyAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white hover:bg-[#162d4a] transition-colors active:scale-[.97] shadow-sm"
          >
            Add first record
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
            {cols.map(c => (
              <th
                key={c.header}
                className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                style={c.width ? { width: c.width } : {}}
              >
                {c.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3 w-20" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors group">
              {cols.map(c => (
                <td key={c.header} className="px-4 py-3 text-gray-800">
                  {c.render(row)}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        disabled={deletingId === row.id}
                        className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        {deletingId === row.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
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