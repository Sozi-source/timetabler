# Update-TimetablePage.ps1
# Fix: Show Publish button for both DRAFT and PUBLISHED statuses
# Usage: .\Update-TimetablePage.ps1 -FilePath "path\to\page.tsx"

param(
    [Parameter(Mandatory = $false)]
    [string]$FilePath = ".\page.tsx"
)

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$content = Get-Content $FilePath -Raw -Encoding UTF8

# ── Patch 1 ───────────────────────────────────────────────────────────────────
# Move the Publish button outside the `status === 'DRAFT'` block so it also
# appears when status === 'PUBLISHED'.
#
# BEFORE:
#   {status === 'DRAFT' && (
#     <>
#       <button /* Generate */ />
#       {totalEntries > 0 && <button /* Clear Draft */ />}
#       <button /* Publish */ />        ← hidden when not DRAFT
#     </>
#   )}
#
# AFTER:
#   {status === 'DRAFT' && (
#     <>
#       <button /* Generate */ />
#       {totalEntries > 0 && <button /* Clear Draft */ />}
#     </>
#   )}
#   {(status === 'DRAFT' || status === 'PUBLISHED') && (
#     <button /* Publish */ />          ← visible for both statuses
#   )}
# ─────────────────────────────────────────────────────────────────────────────

$oldBlock = @'
              {status === 'DRAFT' && (
            <>
              <button
                onClick={isGenerating || isValidating ? handleCancelGenerate : handleGenerate}
                disabled={clearing}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm',
                  isGenerating || isValidating ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#1e3a5f] hover:bg-[#162d4a]',
                )}
              >
                {isValidating ? <><ShieldCheck className="h-4 w-4 animate-pulse" />Validating…</>
                  : isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Cancel</>
                  : <><BookOpen className="h-4 w-4" />Generate</>}
              </button>

              {totalEntries > 0 && (
                <button
                  onClick={handleClearDraft}
                  disabled={clearing || isGenerating || isValidating}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                >
                  {clearing ? <><Loader2 className="h-4 w-4 animate-spin" />Clearing…</> : <><Trash2 className="h-4 w-4" />Clear Draft</>}
                </button>
              )}

              <button
                onClick={() => handlePublish()}
                disabled={publishing || totalEntries === 0 || isGenerating || isValidating}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {publishing ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</> : <><Send className="h-4 w-4" />Publish</>}
              </button>
            </>
          )}
'@

$newBlock = @'
              {status === 'DRAFT' && (
            <>
              <button
                onClick={isGenerating || isValidating ? handleCancelGenerate : handleGenerate}
                disabled={clearing}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm',
                  isGenerating || isValidating ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#1e3a5f] hover:bg-[#162d4a]',
                )}
              >
                {isValidating ? <><ShieldCheck className="h-4 w-4 animate-pulse" />Validating…</>
                  : isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Cancel</>
                  : <><BookOpen className="h-4 w-4" />Generate</>}
              </button>

              {totalEntries > 0 && (
                <button
                  onClick={handleClearDraft}
                  disabled={clearing || isGenerating || isValidating}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                >
                  {clearing ? <><Loader2 className="h-4 w-4 animate-spin" />Clearing…</> : <><Trash2 className="h-4 w-4" />Clear Draft</>}
                </button>
              )}
            </>
          )}

          {(status === 'DRAFT' || status === 'PUBLISHED') && (
            <button
              onClick={() => handlePublish()}
              disabled={publishing || totalEntries === 0 || isGenerating || isValidating}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {publishing ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</> : <><Send className="h-4 w-4" />Publish</>}
            </button>
          )}
'@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "✔  Patch applied: Publish button now visible for DRAFT and PUBLISHED." -ForegroundColor Green
} else {
    Write-Warning "Could not find the exact block to replace. The file may already be patched or has different whitespace."
    Write-Host "  → No changes written." -ForegroundColor Yellow
    exit 1
}

# Write back (UTF-8 without BOM to keep Next.js happy)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText(
    (Resolve-Path $FilePath).Path,
    $content,
    $utf8NoBom
)

Write-Host ""
Write-Host "✔  File updated: $FilePath" -ForegroundColor Green
Write-Host ""
Write-Host "Summary of change:" -ForegroundColor Cyan
Write-Host "  • Publish button is now rendered outside the {status === 'DRAFT'} block."
Write-Host "  • It appears when status is 'DRAFT' or 'PUBLISHED'."
Write-Host "  • Generate / Clear Draft buttons remain DRAFT-only (unchanged)."
Write-Host "  • Publish is still disabled when totalEntries === 0 or generation is in progress."
