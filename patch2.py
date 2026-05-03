"""
patch2.py — Round 2 responsive design patch
Reads actual file contents before patching. Run from fe-timetable root.
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(path):
    full = os.path.join(ROOT, path)
    with open(full, encoding='utf-8') as f:
        return f.read()

def write(path, content):
    full = os.path.join(ROOT, path)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  ✅  PATCHED: {path}')

def patch(path, old, new, label=''):
    content = read(path)
    if old not in content:
        print(f'  ⚠️  Pattern not found in {path}' + (f' [{label}]' if label else ''))
        return False
    write(path, content.replace(old, new, 1))
    return True

results = []

# ─────────────────────────────────────────────────────────────────────────────
# 1. globals.css — add responsive utilities
# ─────────────────────────────────────────────────────────────────────────────
print('[1/14] globals.css — add mobile-first utilities')
css_path = 'app/globals.css'
css = read(css_path)

GLOBALS_APPEND = """
/* ── Responsive utilities (patch2) ─────────────────────────── */
.page-container {
  width: 100%;
  max-width: 64rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
@media (min-width: 640px) {
  .page-container { padding-left: 1.5rem; padding-right: 1.5rem; }
}

/* Auth card */
.auth-bg {
  min-height: 100svh;
  background: linear-gradient(135deg, #1e3a5f 0%, #162d4a 60%, #0f1e30 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.auth-card {
  width: 100%;
  max-width: 24rem;
  border-radius: 1.25rem;
  background: white;
  box-shadow: 0 25px 60px -12px rgba(0,0,0,0.4);
  overflow: hidden;
}
.auth-card-accent {
  height: 4px;
  background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
}

/* Setup shell header */
.setup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.setup-header-add {
  width: 100%;
}
@media (min-width: 480px) {
  .setup-header-add { width: auto; }
}

/* Modal — bottom sheet on mobile, centered on desktop */
.modal-sheet {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
@media (min-width: 640px) {
  .modal-sheet {
    align-items: center;
    padding: 1rem;
  }
}
.modal-panel {
  width: 100%;
  max-height: 92svh;
  border-radius: 1.25rem 1.25rem 0 0;
  background: white;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
@media (min-width: 640px) {
  .modal-panel {
    max-width: 32rem;
    max-height: 90vh;
    border-radius: 1.25rem;
    box-shadow: 0 25px 60px -12px rgba(0,0,0,0.35);
  }
}
.modal-drag-handle {
  width: 2.5rem;
  height: 4px;
  background: #e2e8f0;
  border-radius: 9999px;
  margin: 0.625rem auto 0;
  display: block;
}
@media (min-width: 640px) {
  .modal-drag-handle { display: none; }
}

/* TrainerPanel — full width on mobile */
.trainer-panel {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
}
.trainer-panel-inner {
  width: 100%;
  max-width: 100%;
  height: 100%;
  background: white;
  box-shadow: -4px 0 30px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
}
@media (min-width: 480px) {
  .trainer-panel-inner { max-width: 28rem; }
}

/* TermProgress stats wrap */
.term-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
}

/* Trainer cards grid */
.trainer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .trainer-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .trainer-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Cohort grid */
.cohort-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 480px) {
  .cohort-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .cohort-grid { grid-template-columns: repeat(3, 1fr); }
}

/* AI chat panel */
.ai-panel {
  position: fixed;
  bottom: 6rem;
  right: 1rem;
  z-index: 50;
  width: calc(100vw - 2rem);
  max-height: 560px;
  display: flex;
  flex-direction: column;
  border-radius: 1rem;
  background: white;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
@media (min-width: 480px) {
  .ai-panel { width: 380px; right: 1.5rem; }
}

/* Institution day toggles wrap */
.day-toggle-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Units-on-offer unit row */
.unit-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
}
@media (min-width: 640px) {
  .unit-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

/* Constraint table scroll */
.constraint-table-wrap {
  overflow-x: auto;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
"""

if '/* ── Responsive utilities (patch2)' not in css:
    write(css_path, css + GLOBALS_APPEND)
else:
    print('  ℹ️  Already patched: globals.css')

# ─────────────────────────────────────────────────────────────────────────────
# 2. auth/layout.tsx — richer gradient background
# ─────────────────────────────────────────────────────────────────────────────
print('[2/14] app/(auth)/layout.tsx — gradient auth background')
patch(
    'app/(auth)/layout.tsx',
    '<div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-4">',
    '<div className="min-h-svh bg-gradient-to-br from-[#1e3a5f] via-[#162d4a] to-[#0f1e30] flex items-center justify-center p-4 sm:p-6">',
)

# ─────────────────────────────────────────────────────────────────────────────
# 3. auth/login/page.tsx — show/hide password + better mobile padding
# ─────────────────────────────────────────────────────────────────────────────
print('[3/14] app/(auth)/login/page.tsx — password toggle + mobile polish')
login = read('app/(auth)/login/page.tsx')

# Add Eye icons import
login = login.replace(
    "import { Calendar, Loader2 } from 'lucide-react'",
    "import { Calendar, Loader2, Eye, EyeOff } from 'lucide-react'"
)

# Add showPassword state after loading state
login = login.replace(
    "const [loading, setLoading]   = useState(false)",
    "const [loading, setLoading]   = useState(false)\n  const [showPwd, setShowPwd] = useState(false)"
)

# Make card wider on mobile, add accent bar
login = login.replace(
    '<div className="w-full max-w-sm">',
    '<div className="w-full max-w-sm">'
)
login = login.replace(
    '<div className="rounded-2xl bg-white shadow-2xl p-8">',
    '<div className="rounded-2xl bg-white shadow-2xl overflow-hidden">\n        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />\n        <div className="p-6 sm:p-8">'
)

# Fix password input to be show/hide
login = login.replace(
    '''          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              placeholder="Enter your password"
            />
          </div>''',
    '''          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>'''
)

# Close the extra div we opened
login = login.replace(
    '</form>\n      </div>\n\n      <p className="mt-4',
    '</form>\n        </div>\n      </div>\n\n      <p className="mt-4'
)

write('app/(auth)/login/page.tsx', login)

# ─────────────────────────────────────────────────────────────────────────────
# 4. SetupShell.tsx — responsive header
# ─────────────────────────────────────────────────────────────────────────────
print('[4/14] SetupShell.tsx — responsive header stack')
patch(
    'components/features/setup/SetupShell.tsx',
    '<div className="flex items-center justify-between">',
    '<div className="flex flex-wrap items-start justify-between gap-3">'
)
patch(
    'components/features/setup/SetupShell.tsx',
    'className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"',
    'className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors w-full sm:w-auto justify-center"'
)

# ─────────────────────────────────────────────────────────────────────────────
# 5. SetupModal.tsx — bottom sheet on mobile + drag handle
# ─────────────────────────────────────────────────────────────────────────────
print('[5/14] SetupModal.tsx — bottom sheet on mobile')
patch(
    'components/features/setup/SetupModal.tsx',
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">',
    '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">'
)
patch(
    'components/features/setup/SetupModal.tsx',
    '<div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">',
    '<div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[92svh] sm:max-h-[90vh] flex flex-col">\n        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 sm:hidden" />'
)

# ─────────────────────────────────────────────────────────────────────────────
# 6. ResolveModal.tsx — bottom sheet on mobile
# ─────────────────────────────────────────────────────────────────────────────
print('[6/14] ResolveModal.tsx — bottom sheet on mobile')
patch(
    'components/features/conflicts/ResolveModal.tsx',
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">',
    '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">'
)
patch(
    'components/features/conflicts/ResolveModal.tsx',
    '<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">',
    '<div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[92svh] sm:max-h-[90vh]">\n        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 sm:hidden" />'
)

# ─────────────────────────────────────────────────────────────────────────────
# 7. EntryEditModal.tsx — bottom sheet on mobile
# ─────────────────────────────────────────────────────────────────────────────
print('[7/14] EntryEditModal.tsx — bottom sheet on mobile')
patch(
    'components/features/timetable/EntryEditModal.tsx',
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">',
    '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">'
)
patch(
    'components/features/timetable/EntryEditModal.tsx',
    '<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">',
    '<div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[92svh] flex flex-col overflow-hidden">\n        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />'
)
# Make fields scrollable
patch(
    'components/features/timetable/EntryEditModal.tsx',
    '<div className="px-6 py-4 space-y-4">',
    '<div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 8. ConstraintModal.tsx — bottom sheet on mobile
# ─────────────────────────────────────────────────────────────────────────────
print('[8/14] ConstraintModal.tsx — bottom sheet on mobile')
patch(
    'components/features/constraints/ConstraintModal.tsx',
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">',
    '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">'
)
patch(
    'components/features/constraints/ConstraintModal.tsx',
    '<div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">',
    '<div className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92svh] sm:max-h-[90vh]">\n        <span className="block w-10 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />'
)

# ─────────────────────────────────────────────────────────────────────────────
# 9. TrainerPanel.tsx — full screen on mobile
# ─────────────────────────────────────────────────────────────────────────────
print('[9/14] TrainerPanel.tsx — full screen on mobile')
patch(
    'components/features/curriculum/TrainerPanel.tsx',
    '<div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>',
    '<div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>'
)
patch(
    'components/features/curriculum/TrainerPanel.tsx',
    '<div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>',
    '<div className="w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 10. TermProgress.tsx — wrap stats on small screens
# ─────────────────────────────────────────────────────────────────────────────
print('[10/14] TermProgress.tsx — responsive stats wrap')
patch(
    'components/features/dashboard/TermProgress.tsx',
    '<div className="flex flex-wrap items-start justify-between gap-4 mb-4">',
    '<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">'
)
patch(
    'components/features/dashboard/TermProgress.tsx',
    '<div className="flex gap-6">',
    '<div className="flex flex-wrap gap-4 sm:gap-6">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 11. constraints/page.tsx — table scroll wrapper + responsive header
# ─────────────────────────────────────────────────────────────────────────────
print('[11/14] constraints/page.tsx — table scroll + responsive header')
patch(
    'app/(dashboard)/constraints/page.tsx',
    '<div className="flex items-center justify-between">',
    '<div className="flex flex-wrap items-start justify-between gap-3">'
)
patch(
    'app/(dashboard)/constraints/page.tsx',
    'className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors"\n        >\n          <Plus className="h-4 w-4" />\n          Add constraint',
    'className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162d4a] transition-colors w-full sm:w-auto justify-center"\n        >\n          <Plus className="h-4 w-4" />\n          Add constraint'
)
patch(
    'app/(dashboard)/constraints/page.tsx',
    '<div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">',
    '<div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto min-w-0">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 12. institution/page.tsx — day toggles wrap
# ─────────────────────────────────────────────────────────────────────────────
print('[12/14] institution/page.tsx — teaching days wrap')
patch(
    'app/(dashboard)/setup/institution/page.tsx',
    '<div className="flex flex-wrap gap-2">',
    '<div className="flex flex-wrap gap-2 max-w-sm">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 13. timetable/trainer/page.tsx — 2-col grid on tablet+
# ─────────────────────────────────────────────────────────────────────────────
print('[13/14] timetable/trainer/page.tsx — responsive trainer grid')
patch(
    'app/(dashboard)/timetable/trainer/page.tsx',
    '<div className="grid gap-3">',
    '<div className="grid gap-3 sm:grid-cols-2">'
)
# Second occurrence (inactive)
patch(
    'app/(dashboard)/timetable/trainer/page.tsx',
    '<div className="grid gap-3 opacity-60">',
    '<div className="grid gap-3 sm:grid-cols-2 opacity-60">'
)

# ─────────────────────────────────────────────────────────────────────────────
# 14. TimetableAI.tsx — responsive chat panel width
# ─────────────────────────────────────────────────────────────────────────────
print('[14/14] TimetableAI.tsx — responsive chat panel')
patch(
    'components/features/timetable/TimetableAI.tsx',
    '<div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">',
    '<div className="fixed bottom-24 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[380px] max-h-[560px] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">'
)

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
print("""
╔══════════════════════════════════════════════════════════╗
║         Responsive Design Patch 2 — COMPLETE             ║
╠══════════════════════════════════════════════════════════╣
║  1.  globals.css         — new responsive utilities      ║
║  2.  auth/layout.tsx     — richer gradient bg            ║
║  3.  login/page.tsx      — password toggle + accent bar  ║
║  4.  SetupShell.tsx      — header wraps on mobile        ║
║  5.  SetupModal.tsx      — bottom sheet on mobile        ║
║  6.  ResolveModal.tsx    — bottom sheet on mobile        ║
║  7.  EntryEditModal.tsx  — bottom sheet on mobile        ║
║  8.  ConstraintModal.tsx — bottom sheet on mobile        ║
║  9.  TrainerPanel.tsx    — full screen on mobile         ║
║  10. TermProgress.tsx    — stats wrap on small screens   ║
║  11. constraints/page    — table scroll + header wrap    ║
║  12. institution/page    — day toggles wrap              ║
║  13. trainer/page.tsx    — 2-col trainer grid            ║
║  14. TimetableAI.tsx     — responsive chat panel         ║
╚══════════════════════════════════════════════════════════╝
Next: python patch.py  (if not done yet), then npm run dev
""")
