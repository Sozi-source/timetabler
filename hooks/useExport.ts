'use client'

import { useState, useCallback, useRef } from 'react'
import api from '@/lib/api'

export type ExportFormat = 'html' | 'xlsx' | 'pdf' | 'docx'

export interface DownloadOptions {
  url:     string
  params?: Record<string, string | number | boolean>
  fmt:     ExportFormat
  label?:  string
}

export interface UseExportReturn {
  download: (opts: DownloadOptions) => Promise<void>
  loading:  boolean
  error:    string | null
  cancel:   () => void
}

const FORMAT_META: Record<ExportFormat, { mime: string; ext: string }> = {
  html: { mime: 'text/html',                                                               ext: 'html' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       ext: 'xlsx' },
  pdf:  { mime: 'application/pdf',                                                          ext: 'pdf'  },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
}

const TOKEN_KEY = 'timetabler_token'

// Strip leading /api/ so axios doesn't double it against baseURL
function toAxiosPath(url: string): string {
  return url.replace(/^\//, '').replace(/^api\//, '')
}

function filenameFromHeaders(headers: Record<string, string>, label: string, ext: string): string {
  const match = (headers['content-disposition'] ?? '').match(/filename="?([^";\n]+)"?/i)
  if (match?.[1]) return match[1]
  return `timetable_${label}_${new Date().toISOString().slice(0, 10)}.${ext}`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function useExport(): UseExportReturn {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef              = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
  }, [])

  const download = useCallback(async ({ url, params = {}, fmt, label = 'timetable' }: DownloadOptions) => {
    const path = toAxiosPath(url)

    if (fmt === 'html') {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
      const base  = (api.defaults.baseURL ?? '').replace(/\/$/, '')
      const qs    = new URLSearchParams({
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        fmt,
        ...(token ? { token } : {}),
      })
      window.open(`${base}/${path}?${qs}`, '_blank', 'noopener,noreferrer')
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const meta = FORMAT_META[fmt]
      const resp = await api.get(path, {
        params:       { ...params, fmt },
        responseType: 'blob',
        signal:       abortRef.current.signal,
      })

      triggerDownload(
        new Blob([resp.data as BlobPart], { type: meta.mime }),
        filenameFromHeaders(resp.headers as Record<string, string>, label, meta.ext),
      )
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'CanceledError') return

      const status = (err as { response?: { status?: number } })?.response?.status
      const msg    = status
        ? `Export failed (HTTP ${status})`
        : ((err as { message?: string })?.message ?? 'Export failed')

      console.error('[useExport]', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return { download, loading, error, cancel }
}