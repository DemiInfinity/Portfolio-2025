const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type DateInput = string | Date | null | undefined

/** Parses YYYY-MM-DD (or a full ISO string) as a calendar date, ignoring the time zone. */
function parts(value: DateInput): { y: number; m: number; d: number } | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return { y: value.getUTCFullYear(), m: value.getUTCMonth(), d: value.getUTCDate() }
  }
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(value))
  if (match) return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3] ?? '1') }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate() }
}

/** "Aug 2025" */
export function formatMonthYear(value: DateInput, long = false): string {
  const p = parts(value)
  if (!p) return ''
  return `${(long ? MONTHS_LONG : MONTHS_SHORT)[p.m]} ${p.y}`
}

/**
 * Date range for a role.
 * 'site': "Aug 2025 – now", "Jun – Aug 2024" (same year collapses), "Jul 2022 – Jun 2024".
 * 'cv':   "Aug 2025 – Present", "Jun 2024 – Aug 2024".
 */
export function formatRange(start: DateInput, end: DateInput, style: 'site' | 'cv' = 'site'): string {
  const s = parts(start)
  const e = parts(end)
  if (!s) return ''
  const startFull = `${MONTHS_SHORT[s.m]} ${s.y}`
  if (!e) return `${startFull} – ${style === 'cv' ? 'Present' : 'now'}`
  const endFull = `${MONTHS_SHORT[e.m]} ${e.y}`
  if (style === 'site' && s.y === e.y) {
    if (s.m === e.m) return endFull
    return `${MONTHS_SHORT[s.m]} – ${endFull}`
  }
  return `${startFull} – ${endFull}`
}

/** "1 April 2026" */
export function formatLongDate(value: DateInput): string {
  const p = parts(value)
  if (!p) return ''
  return `${p.d} ${MONTHS_LONG[p.m]} ${p.y}`
}

/** Whole years between `value` and `now`, e.g. for the "5+" stat. */
export function yearsSince(value: DateInput, now: Date = new Date()): number {
  const p = parts(value)
  if (!p) return 0
  let years = now.getUTCFullYear() - p.y
  if (now.getUTCMonth() < p.m || (now.getUTCMonth() === p.m && now.getUTCDate() < p.d)) years -= 1
  return Math.max(0, years)
}

/** "my-heading" ids for headings. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
