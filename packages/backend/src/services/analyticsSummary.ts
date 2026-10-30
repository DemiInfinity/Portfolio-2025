/**
 * Pure aggregation for GET /api/analytics/summary (H-1). No I/O; unit-tested.
 */

export interface PageViewRow {
  session_id: string | null
  page_path: string
  page_title?: string | null
  referrer?: string | null
  visit_duration?: number | null
  created_at: string
}

export interface AnalyticsSummary {
  range: { from: string; to: string; days: number }
  generatedAt: string
  visits: number
  pageViews: number
  avgSecondsPerView: number
  daily: { date: string; visits: number }[]
  pages: { path: string; title: string | null; views: number; avgSeconds: number }[]
  referrers: { source: string; visits: number }[]
}

const DAY_MS = 24 * 60 * 60 * 1000

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** The last `days` whole UTC days ending today: [fromIso, toExclusiveIso). */
export function summaryWindow(days: number, now: Date = new Date()) {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const fromMs = todayStart - (days - 1) * DAY_MS
  return {
    from: ymd(new Date(fromMs)),
    to: ymd(new Date(todayStart)),
    fromIso: new Date(fromMs).toISOString(),
    toExclusiveIso: new Date(todayStart + DAY_MS).toISOString(),
    dates: Array.from({ length: days }, (_, i) => ymd(new Date(fromMs + i * DAY_MS)))
  }
}

function isOwnHost(host: string): boolean {
  return (
    host === 'demitaylornimmo.com' ||
    host.endsWith('.demitaylornimmo.com') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app')
  )
}

/** Referrer → source label: hostname without `www.`, or "Direct". */
export function referrerSource(referrer: string | null | undefined): string {
  const raw = String(referrer ?? '').trim()
  if (!raw) return 'Direct'
  let host: string
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase()
  } catch {
    return 'Direct'
  }
  if (!host || (!host.includes('.') && host !== 'localhost')) return 'Direct'
  host = host.replace(/^www\./, '')
  return isOwnHost(host) ? 'Direct' : host
}

export function summariseAnalytics(rows: PageViewRow[], days: number, now: Date = new Date()): AnalyticsSummary {
  const win = summaryWindow(days, now)
  const fromMs = Date.parse(win.fromIso)
  const toMs = Date.parse(win.toExclusiveIso)
  const inRange = rows.filter((r) => {
    const t = Date.parse(r.created_at)
    return Number.isFinite(t) && t >= fromMs && t < toMs
  })

  // A row without a session is its own visit.
  const visitKey = (r: PageViewRow, i: number) => (r.session_id ? `s:${r.session_id}` : `row:${i}`)

  const firstRowOfVisit = new Map<string, PageViewRow>()
  const dailySets = new Map<string, Set<string>>(win.dates.map((d) => [d, new Set<string>()]))
  const pages = new Map<string, { views: number; duration: number; title: string | null; titleAt: number }>()
  let totalDuration = 0

  inRange.forEach((r, i) => {
    const key = visitKey(r, i)
    const t = Date.parse(r.created_at)
    const first = firstRowOfVisit.get(key)
    if (!first || t < Date.parse(first.created_at)) firstRowOfVisit.set(key, r)

    dailySets.get(new Date(r.created_at).toISOString().slice(0, 10))?.add(key)

    const duration = Number(r.visit_duration) > 0 ? Number(r.visit_duration) : 0
    totalDuration += duration

    const page = pages.get(r.page_path) || { views: 0, duration: 0, title: null, titleAt: -Infinity }
    page.views += 1
    page.duration += duration
    const title = typeof r.page_title === 'string' ? r.page_title.trim() : ''
    if (title && t >= page.titleAt) {
      page.title = title
      page.titleAt = t
    }
    pages.set(r.page_path, page)
  })

  const referrerCounts = new Map<string, number>()
  for (const r of firstRowOfVisit.values()) {
    const source = referrerSource(r.referrer)
    referrerCounts.set(source, (referrerCounts.get(source) || 0) + 1)
  }

  const byCountThenName = <T>(count: (x: T) => number, name: (x: T) => string) => (a: T, b: T) =>
    count(b) - count(a) || (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0)

  return {
    range: { from: win.from, to: win.to, days },
    generatedAt: now.toISOString(),
    visits: firstRowOfVisit.size,
    pageViews: inRange.length,
    avgSecondsPerView: inRange.length ? Math.round(totalDuration / inRange.length) : 0,
    daily: win.dates.map((date) => ({ date, visits: dailySets.get(date)!.size })),
    pages: [...pages.entries()]
      .map(([path, p]) => ({ path, title: p.title, views: p.views, avgSeconds: Math.round(p.duration / p.views) }))
      .sort(byCountThenName((p) => p.views, (p) => p.path)),
    referrers: [...referrerCounts.entries()]
      .map(([source, visits]) => ({ source, visits }))
      .sort(byCountThenName((r) => r.visits, (r) => r.source))
  }
}
