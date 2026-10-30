export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n: number) => String(n).padStart(2, '0')

/** Local "YYYY-MM-DD" for a Date. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** Local "YYYY-MM" for a Date. */
export const isoMonth = (d: Date) => isoDay(d).slice(0, 7)

/** Any API date ("2025-08-01", "2025-08-01T00:00:00Z", "2025-08") -> "YYYY-MM-DD" ("" when empty). Date part only, no time zone shift. */
export const dayOf = (v?: string | null) => {
  if (!v) return ''
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(v)
  return m ? `${m[1]}-${m[2]}-${m[3] || '01'}` : ''
}
/** API date -> "YYYY-MM" for a month input. */
export const monthOf = (v?: string | null) => dayOf(v).slice(0, 7)
/** Month input -> API date "YYYY-MM-01", or null when empty (Decision 7, H-8 point 6). */
export const monthToApi = (v: string) => (v ? `${v.slice(0, 7)}-01` : null)

/** "1 Apr 2026" (or "—"). */
export const fmtDay = (v?: string | null) => {
  const d = dayOf(v)
  if (!d) return '—'
  const [y, m, dd] = d.split('-').map(Number)
  return `${dd} ${MON[m - 1]} ${y}`
}
/** "Aug 2025". */
export const fmtMon = (v?: string | null) => {
  const d = dayOf(v)
  if (!d) return ''
  const [y, m] = d.split('-').map(Number)
  return `${MON[m - 1]} ${y}`
}
/** "December 2025". */
export const fmtMonth = (v?: string | null) => {
  const d = dayOf(v)
  if (!d) return ''
  const [y, m] = d.split('-').map(Number)
  return `${MONTH[m - 1]} ${y}`
}

const ym = (v: string) => {
  const [y, m] = monthOf(v).split('-').map(Number)
  return { y, m }
}

/** Months from a to b, inclusive of both. */
export const monthsInclusive = (a: string, b: string) => {
  const x = ym(a)
  const z = ym(b)
  return z.y * 12 + z.m - (x.y * 12 + x.m) + 1
}

/** "1 yr 3 mos", "3 mos", "2 yrs". */
export const duration = (n: number) => {
  const y = Math.floor(n / 12)
  const m = n % 12
  return [y ? y + (y === 1 ? ' yr' : ' yrs') : '', m ? m + (m === 1 ? ' mo' : ' mos') : ''].filter(Boolean).join(' ') || '1 mo'
}

/** "Aug 2025 – now", "Jun – Aug 2024", "Jul 2022 – Jun 2024". */
export const monthRange = (start?: string | null, end?: string | null) => {
  if (!start) return end ? '– ' + fmtMon(end) : ''
  if (!end) return fmtMon(start) + ' – now'
  const a = ym(start)
  const b = ym(end)
  if (a.y === b.y) return `${MON[a.m - 1]} – ${MON[b.m - 1]} ${a.y}`
  return `${fmtMon(start)} – ${fmtMon(end)}`
}

/** Whole days from today (local) to an API date; negative when past. */
export const daysUntil = (v: string, today: Date) => {
  const [y, m, d] = dayOf(v).split('-').map(Number)
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86400000)
}

/** Non-empty trimmed lines. */
export const lines = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean)
/** Non-empty trimmed comma items. */
export const commas = (t: string) => t.split(',').map((s) => s.trim()).filter(Boolean)

/** API arrays sometimes arrive as JSON strings or comma strings. */
export const toArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v.trim()) {
    if (v.trim().startsWith('[')) {
      try {
        const p = JSON.parse(v)
        return Array.isArray(p) ? p.map(String) : []
      } catch {
        return []
      }
    }
    return commas(v)
  }
  return []
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** URL slug from a title: "My New App!" -> "my-new-app". */
export const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
