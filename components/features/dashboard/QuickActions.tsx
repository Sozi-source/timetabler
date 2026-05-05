'use client'

import { Play, CheckCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react'

type Action = 'generate' | 'publish' | 'clear' | null

interface QuickActionsProps {
  busy: Action
  draftUnits: number
  pendingConflicts: number
  onGenerate: () => void
  onPublish: () => void
  onClear: () => void
  onResolveConflicts: () => void
}

export default function QuickActions({
  busy,
  draftUnits,
  pendingConflicts,
  onGenerate,
  onPublish,
  onClear,
  onResolveConflicts,
}: QuickActionsProps) {
  return (
    <div className="space-y-3">
      <p
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: '#374151' }}
      >
        Quick actions
      </p>

      <div className="flex flex-col gap-2.5">

        {/* Generate */}
        <button
          onClick={onGenerate}
          disabled={!!busy}
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#1e3a5f', color: '#e0ecff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {busy === 'generate'
              ? <Loader2 size={14} className="animate-spin" />
              : <Play size={14} />}
          </span>
          <span className="text-[13px] font-semibold">
            {busy === 'generate' ? 'Generating…' : 'Generate timetable'}
          </span>
          <span className="ml-auto opacity-40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </button>

        {/* Publish */}
        <button
          onClick={onPublish}
          disabled={!!busy || draftUnits === 0}
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: '#ecfdf5', color: '#065f46', border: 'none', cursor: (busy || draftUnits === 0) ? 'not-allowed' : 'pointer' }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            {busy === 'publish'
              ? <Loader2 size={14} className="animate-spin" style={{ color: '#059669' }} />
              : <CheckCircle size={14} style={{ color: '#059669' }} />}
          </span>
          <span className="text-[13px] font-semibold">
            {busy === 'publish'
              ? 'Publishing…'
              : draftUnits > 0
                ? `Publish ${draftUnits} draft${draftUnits !== 1 ? 's' : ''}`
                : 'No drafts to publish'}
          </span>
          <span className="ml-auto opacity-35">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </button>

        {/* Clear drafts */}
        <button
          onClick={onClear}
          disabled={!!busy || draftUnits === 0}
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: '#fef2f2', color: '#7f1d1d', border: 'none', cursor: (busy || draftUnits === 0) ? 'not-allowed' : 'pointer' }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(239,68,68,0.12)' }}
          >
            {busy === 'clear'
              ? <Loader2 size={14} className="animate-spin" style={{ color: '#ef4444' }} />
              : <Trash2 size={14} style={{ color: '#ef4444' }} />}
          </span>
          <span className="text-[13px] font-semibold">
            {busy === 'clear' ? 'Clearing…' : 'Clear all drafts'}
          </span>
          <span className="ml-auto opacity-35">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </button>

        {/* Conflicts — only shown when there are pending ones */}
        {pendingConflicts > 0 && (
          <button
            onClick={onResolveConflicts}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
            style={{ background: '#fff7ed', color: '#7c2d12', border: 'none', cursor: 'pointer' }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(249,115,22,0.15)' }}
            >
              <AlertTriangle size={14} style={{ color: '#ea580c' }} />
            </span>
            <span className="text-[13px] font-semibold">
              Resolve {pendingConflicts} conflict{pendingConflicts !== 1 ? 's' : ''}
            </span>
            <span className="ml-auto opacity-35">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
        )}

      </div>
    </div>
  )
}