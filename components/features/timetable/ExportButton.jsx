'use client';
/**
 * ExportButton.jsx
 * ================
 * Split-button for exporting the timetable in HTML, Excel, PDF, or Word.
 * Uses lucide-react icons to match the rest of the timetable page.
 *
 * Location: src/components/features/timetable/ExportButton.jsx
 *
 * Props
 * -----
 * url    {string}  — API path, e.g. '/api/export/master/'
 * params {object}  — Extra query params, e.g. { term: termId }
 * label  {string}  — Used in fallback filename, e.g. 'master'
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2, Globe, Sheet, FileText, FileType2, X } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { cn } from '@/lib/utils';

// ── Format config ─────────────────────────────────────────────────────────────

const FORMATS = [
  { fmt: 'pdf',  label: 'PDF',   Icon: FileText,  desc: 'Print-ready'    },
  { fmt: 'xlsx', label: 'Excel', Icon: Sheet,      desc: 'Spreadsheet'    },
  { fmt: 'docx', label: 'Word',  Icon: FileType2,  desc: 'Editable doc'   },
  { fmt: 'html', label: 'HTML',  Icon: Globe,      desc: 'Opens in tab'   },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExportButton({ url, params = {}, label = 'timetable' }) {
  const { download, loading, error, cancel } = useExport();

  // Remember last-used format (default: pdf)
  const [activeFmt,   setActiveFmt]   = useState('pdf');
  const [dropOpen,    setDropOpen]    = useState(false);
  const dropRef                       = useRef(null);

  const activeMeta = FORMATS.find(f => f.fmt === activeFmt) ?? FORMATS[0];

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const triggerExport = useCallback(async (fmt) => {
    setDropOpen(false);
    setActiveFmt(fmt);
    await download({ url, params, fmt, label });
  }, [url, params, label, download]);

  const selectFormat = useCallback(async (fmt) => {
    setActiveFmt(fmt);
    setDropOpen(false);
    await download({ url, params, fmt, label });
  }, [url, params, label, download]);

  return (
    <div className="relative flex items-center" ref={dropRef}>

      {/* Primary button — triggers last-used format */}
      <button
        onClick={() => loading ? cancel() : triggerExport(activeFmt)}
        className={cn(
          'flex items-center gap-2 rounded-l-xl px-3 py-1.5 text-sm font-semibold text-white transition-all shadow-sm',
          loading
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-[#1e3a5f] hover:bg-[#162d4a]',
        )}
        title={loading ? 'Cancel export' : `Export as ${activeMeta.label}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Exporting…</span>
            <X className="h-3.5 w-3.5 ml-0.5 opacity-70" />
          </>
        ) : (
          <>
            <activeMeta.Icon className="h-4 w-4" />
            <span>Export {activeMeta.label}</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-7 bg-white/20 bg-[#1e3a5f]" />

      {/* Chevron — opens format picker */}
      <button
        onClick={() => setDropOpen(o => !o)}
        disabled={loading}
        className="flex items-center justify-center rounded-r-xl bg-[#1e3a5f] hover:bg-[#162d4a] px-2 py-1.5 text-white transition-all shadow-sm disabled:opacity-50"
        title="Choose format"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', dropOpen && 'rotate-180')} />
      </button>

      {/* Format dropdown */}
      {dropOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-2xl border border-gray-200 bg-white shadow-xl py-1.5 overflow-hidden">
          <p className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Export format
          </p>
          {FORMATS.map(({ fmt, label: fmtLabel, Icon, desc }) => (
            <button
              key={fmt}
              onClick={() => selectFormat(fmt)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-gray-50',
                activeFmt === fmt ? 'text-[#1e3a5f] font-bold' : 'text-gray-700',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', activeFmt === fmt ? 'text-[#1e3a5f]' : 'text-gray-400')} />
              <div className="text-left">
                <div>{fmtLabel}</div>
                <div className="text-[11px] text-gray-400 font-normal">{desc}</div>
              </div>
              {activeFmt === fmt && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1e3a5f]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error toast (inline) */}
      {error && !loading && (
        <div className="absolute right-0 top-full mt-1.5 z-30 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-md whitespace-nowrap">
          <X className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}