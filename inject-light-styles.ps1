# inject-light-styles.ps1
# Run from the directory containing your page file:
#   .\inject-light-styles.ps1 -FilePath ".\page.tsx"

param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$content = Get-Content $FilePath -Raw

# ─── Colour token swaps ───────────────────────────────────────────────────────
# The strategy: replace dark slate tokens with light equivalents throughout.

$replacements = [ordered]@{

    # Page / screen background
    'bg-slate-950'                  = 'bg-slate-50'

    # Primary text (was near-white on dark, now near-black on light)
    'text-slate-100'                = 'text-slate-900'

    # Secondary text
    'text-slate-300'                = 'text-slate-700'

    # Tertiary / muted text
    'text-slate-400'                = 'text-slate-500'

    # Faintest muted text
    'text-slate-500'                = 'text-slate-400'

    # Very faint labels / dividers
    'text-slate-600'                = 'text-slate-400'

    # Section headings that use slate-200
    'text-slate-200'                = 'text-slate-800'

    # Card / panel backgrounds
    'bg-slate-800\/40'              = 'bg-white/80'
    'bg-slate-800\/20'              = 'bg-white/60'
    'bg-slate-800\/60'              = 'bg-white'
    'bg-slate-800'                  = 'bg-white'

    # Panel / card borders
    'border-slate-700\/50'          = 'border-slate-200/80'
    'border-slate-700\/60'          = 'border-slate-200'
    'border-slate-700\/30'          = 'border-slate-100'
    'border-slate-700'              = 'border-slate-200'
    'border-slate-600\/40'          = 'border-slate-200'
    'border-slate-600'              = 'border-slate-300'

    # Progress bar track
    'bg-slate-700'                  = 'bg-slate-200'

    # Hover states on panels / rows
    'hover:bg-slate-800\/30'        = 'hover:bg-slate-50'
    'hover:bg-slate-800'            = 'hover:bg-slate-100'

    # Icon container backgrounds
    'bg-slate-700\/60'              = 'bg-slate-100'

    # Dropdown / popover background
    'bg-slate-900'                  = 'bg-white'
    'bg-slate-800\b'                = 'bg-slate-100'   # search input inside dropdown

    # Dropdown input text
    'text-slate-300 placeholder:text-slate-600' = 'text-slate-700 placeholder:text-slate-400'

    # Combined-unit section tints  (violet dark → violet light)
    'bg-violet-950\/10'             = 'bg-violet-50/60'
    'bg-violet-950\/20'             = 'bg-violet-50'
    'border-violet-500\/20'         = 'border-violet-200'
    'border-violet-500\/10'         = 'border-violet-100'

    # Indigo dirty row highlight
    'bg-indigo-950\/20'             = 'bg-indigo-50'

    # Locked / disabled trainer badge
    'bg-slate-800\/40 text-xs text-slate-500' = 'bg-slate-100 text-xs text-slate-400'

    # Trainer dropdown button — unassigned state
    'bg-slate-800\/60 border-slate-700\/50 text-slate-500 hover:border-slate-600' = 'bg-slate-100 border-slate-300 text-slate-400 hover:border-slate-400'

    # Retry / refresh button borders
    'border border-slate-700 rounded-xl px-3 py-1.5 hover:bg-slate-800' = 'border border-slate-300 rounded-xl px-3 py-1.5 hover:bg-slate-100'
    'border border-slate-700 rounded-xl hover:bg-slate-800'             = 'border border-slate-300 rounded-xl hover:bg-slate-100'

    # Empty-state icon
    'text-slate-700\b'              = 'text-slate-300'

    # Dividers inside cohort card
    'divide-slate-700\/30'          = 'divide-slate-100'

    # min-h-screen background (outer wrapper)
    'min-h-screen bg-slate-950 text-slate-100' = 'min-h-screen bg-slate-50 text-slate-900'
}

foreach ($old in $replacements.Keys) {
    $new = $replacements[$old]
    $content = [regex]::Replace($content, [regex]::Escape($old), $new)
}

# ─── Write result ─────────────────────────────────────────────────────────────
Set-Content $FilePath -Value $content -NoNewline

Write-Host "✅  Light styles injected into: $FilePath" -ForegroundColor Green
Write-Host "   Tip: run your dev server to preview the changes." -ForegroundColor DarkGray
