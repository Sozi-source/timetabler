"""
patch_timetable_page.py — run from fe-timetable/ directory
    python patch_timetable_page.py
"""
import pathlib, sys

PAGE = pathlib.Path(
    "app/(dashboard)/timetable/page.tsx"
)

if not PAGE.exists():
    sys.exit(f"Not found: {PAGE}. Run from fe-timetable/ directory.")

src = PAGE.read_text(encoding="utf-8")

# Fix 1: null guard on cohort_name in the cohorts useMemo
OLD1 = """  const cohorts = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of allEntries)
      if (!map.has(e.cohort)) map.set(e.cohort, e.cohort_name)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allEntries])"""

NEW1 = """  const cohorts = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of allEntries) {
      const id = e.cohort ?? ''
      if (id && !map.has(id)) map.set(id, e.cohort_name ?? id)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allEntries])"""

if OLD1 in src:
    src = src.replace(OLD1, NEW1)
    print("Fix 1 (cohort_name null guard): OK")
else:
    print("Fix 1: already patched or not found — skipping")

pathlib.Path("app/(dashboard)/timetable/page.tsx").write_text(src, encoding="utf-8")
print("Done.")
