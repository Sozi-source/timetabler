'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTermStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/types'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Sparkles, X, Send, Loader2, ChevronDown,
  AlertTriangle, CheckCircle2, RefreshCw, Zap,
} from 'lucide-react'

interface ActionButton {
  label: string
  action: 'REGENERATE' | 'MARK_RESOLVED' | 'REASSIGN_TRAINER'
  payload: Record<string, string>
  description: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: ActionButton[]
}

interface AIContext {
  pending_conflicts: number
  term_name: string
}

async function executeAction(
  action: ActionButton,
  termId: string,
  qc: ReturnType<typeof useQueryClient>
): Promise<{ ok: boolean; message: string }> {
  try {
    if (action.action === 'REGENERATE') {
      const res = await api.post('/timetable/generate/', { term_id: termId })
      if (res.data?.ok !== false) {
        qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) })
        qc.invalidateQueries({ queryKey: queryKeys.masterTT(termId) })
        return { ok: true, message: 'Timetable regenerated successfully.' }
      }
      return { ok: false, message: res.data?.error ?? 'Generation failed.' }
    }
    if (action.action === 'MARK_RESOLVED') {
      const conflictId = action.payload.conflict_id
      if (!conflictId) return { ok: false, message: 'No conflict ID provided.' }
      const res = await api.post(`/conflicts/${conflictId}/resolve/`, {
        resolution: 'MANUAL',
        notes: action.payload.notes ?? 'Resolved via AI assistant',
      })
      if (res.data?.ok !== false) {
        qc.invalidateQueries({ queryKey: queryKeys.conflicts(termId) })
        return { ok: true, message: 'Conflict marked as resolved.' }
      }
      return { ok: false, message: res.data?.error ?? 'Could not mark resolved.' }
    }
    if (action.action === 'REASSIGN_TRAINER') {
      return { ok: true, message: `Go to Setup → Curriculum, find ${action.payload.unit_code ?? 'the unit'}, and assign a qualified trainer. Then regenerate.` }
    }
    return { ok: false, message: 'Unknown action.' }
  } catch {
    return { ok: false, message: 'Network error executing action.' }
  }
}

function parseResponse(raw: string): { text: string; actions: ActionButton[] } {
  const actionsMatch = raw.match(/<actions>([\s\S]*?)<\/actions>/)
  const text = raw.replace(/<actions>[\s\S]*?<\/actions>/, '').trim()
  let actions: ActionButton[] = []
  if (actionsMatch) { try { actions = JSON.parse(actionsMatch[1].trim()) } catch { /* ignore */ } }
  return { text, actions }
}

function MessageBubble({ message, onAction, applying }: { message: Message; onAction: (a: ActionButton) => void; applying: boolean }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-2 mb-3', isUser && 'flex-row-reverse')}>
      {!isUser && (
        <div className="shrink-0 h-7 w-7 rounded-full bg-[#1e3a5f] flex items-center justify-center mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end flex flex-col')}>
        <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', isUser ? 'bg-[#1e3a5f] text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm')}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {message.actions.map((action, i) => (
              <button key={i} onClick={() => onAction(action)} disabled={applying}
                className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-left transition-all disabled:opacity-50',
                  action.action === 'REGENERATE' ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100' :
                  action.action === 'MARK_RESOLVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' :
                  'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100')}>
                {action.action === 'REGENERATE' && <RefreshCw className="h-3.5 w-3.5 shrink-0" />}
                {action.action === 'MARK_RESOLVED' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                {action.action === 'REASSIGN_TRAINER' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                <div><p className="font-semibold">{action.label}</p><p className="opacity-70 text-[10px] mt-0.5">{action.description}</p></div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimetableAI() {
  const { activeTerm } = useTermStore()
  const qc = useQueryClient()
  const termId = activeTerm?.id ?? ''
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [aiCtx, setAiCtx] = useState<AIContext | null>(null)
  const [conflictCount, setConflictCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<{ role: string; content: string }[]>([])

  const refreshConflictCount = useCallback(async () => {
    if (!termId) return
    try {
      const res = await api.get(`/conflicts/?term=${termId}`)
      const arr = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      setConflictCount(arr.filter((c: { resolution_status?: string }) => c.resolution_status === 'PENDING').length)
    } catch { /* silent */ }
  }, [termId])

  useEffect(() => { refreshConflictCount(); const t = setInterval(refreshConflictCount, 30_000); return () => clearInterval(t) }, [refreshConflictCount])
  useEffect(() => { if (open) { refreshConflictCount(); if (messages.length === 0) sendGreeting(); setTimeout(() => inputRef.current?.focus(), 100) } }, [open]) // eslint-disable-line
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function callAI(history: { role: string; content: string }[]) {
    const res = await api.post('/ai/chat/', { messages: history, term_id: termId })
    const content: string = res.data?.data?.content ?? 'Sorry, I could not generate a response.'
    const ctx: AIContext | null = res.data?.data?.context ?? null
    const { text, actions } = parseResponse(content)
    return { text, actions, ctx }
  }

  async function sendGreeting() {
    setLoading(true)
    try {
      const prompt = 'Hello! Give me a quick summary of the current timetable state and any conflicts I should know about.'
      historyRef.current = [{ role: 'user', content: prompt }]
      const { text, actions, ctx } = await callAI(historyRef.current)
      if (ctx) { setAiCtx(ctx); setConflictCount(ctx.pending_conflicts) }
      historyRef.current.push({ role: 'assistant', content: text })
      setMessages([{ role: 'assistant', content: text, actions }])
    } catch {
      setMessages([{ role: 'assistant', content: "Hi! I'm your timetable assistant. Ask me about conflicts or how to fix scheduling issues." }])
    } finally { setLoading(false) }
  }

  async function sendMessage(userText?: string) {
    const text = (userText ?? input).trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    historyRef.current.push({ role: 'user', content: text })
    setLoading(true)
    try {
      const { text: aiText, actions, ctx } = await callAI(historyRef.current)
      if (ctx) { setAiCtx(ctx); setConflictCount(ctx.pending_conflicts) }
      setMessages(prev => [...prev, { role: 'assistant', content: aiText, actions }])
      historyRef.current.push({ role: 'assistant', content: aiText })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }])
    } finally { setLoading(false) }
  }

  async function handleAction(action: ActionButton) {
    setApplying(true)
    const result = await executeAction(action, termId, qc)
    setApplying(false)
    const msg: Message = { role: 'assistant', content: result.ok ? `✅ ${result.message}` : `❌ ${result.message}` }
    setMessages(prev => [...prev, msg])
    historyRef.current.push({ role: 'assistant', content: msg.content })
    if (result.ok) await refreshConflictCount()
  }

  function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  if (!termId) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!open && conflictCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {conflictCount} conflict{conflictCount > 1 ? 's' : ''} pending
          </div>
        )}
        <button onClick={() => setOpen(o => !o)} className={cn('relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300', open ? 'bg-gray-700 scale-95' : 'bg-[#1e3a5f] hover:bg-[#162d4a] hover:scale-105')}>
          {open ? <ChevronDown className="h-5 w-5 text-white" /> : <>
            <Sparkles className="h-6 w-6 text-amber-300" />
            {conflictCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{conflictCount}</span>}
          </>}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 bg-[#1e3a5f] px-4 py-3.5 shrink-0">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"><Sparkles className="h-4 w-4 text-amber-300" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Timetable AI</p>
              <p className="text-xs text-white/60">{aiCtx ? (conflictCount === 0 ? `✓ ${aiCtx.term_name} — ready to publish` : `${conflictCount} conflict${conflictCount > 1 ? 's' : ''} · ${aiCtx.term_name}`) : 'Powered by Groq · Llama 3.3 70B'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={sendGreeting} disabled={loading} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-40" title="Refresh"><RefreshCw className="h-3.5 w-3.5" /></button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {messages.length === 0 && loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="h-12 w-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center"><Zap className="h-6 w-6 text-[#1e3a5f]" /></div>
                <p className="text-sm font-semibold text-gray-700">Analysing your timetable…</p>
                <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} onAction={handleAction} applying={applying} />)}
            {loading && messages.length > 0 && (
              <div className="flex gap-2 mb-3">
                <div className="shrink-0 h-7 w-7 rounded-full bg-[#1e3a5f] flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-amber-300" /></div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            {applying && <div className="flex items-center gap-2 text-xs text-gray-500 px-2 mb-2"><Loader2 className="h-3 w-3 animate-spin" />Applying…</div>}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
              {['Explain all conflicts', 'How do I fix this?', 'Can I publish now?', 'Regenerate timetable'].map(q => (
                <button key={q} onClick={() => sendMessage(q)} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-all">{q}</button>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask about conflicts, fixes, or your schedule…" rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent max-h-24 overflow-y-auto" style={{ minHeight: '38px' }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="shrink-0 h-9 w-9 rounded-xl bg-[#1e3a5f] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#162d4a] transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 text-center">Powered by Groq · Always verify AI suggestions before applying</p>
          </div>
        </div>
      )}
    </>
  )
}