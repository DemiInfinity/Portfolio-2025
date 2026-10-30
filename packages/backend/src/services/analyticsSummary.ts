/**
 * Pure aggregation for GET /api/analytics/summary (H-1, revised by H-23).
 * No I/O; unit-tested.
 */
import { isBotUserAgent } from '../utils/bots'

export interface PageViewRow {
  id?: number
  session_id: string | null
  page_path: string
  page_title?: string | null
  referrer?: string | null
  visit_duration?: number | null
  user_agent?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  created_at: string
}

export interface AnalyticsSummary {
  range: { from: string; to: string; days: number }
  generatedAt: string
  visits: number
  pageViews: number
  measuredViews: number
  avgSecondsPerView: number
  daily: { date: string; visits: number }[]
  pages: { path: string; title: string | null; views: number; measuredViews: number; avgSeconds: number }[]
  referrers: { source: string; visits: number }[]
  campaigns: { source: string | null; medium: string | null; campaign: string | null; visits: number }[]
}

/** Durations above this are an idle tab, not reading (audit M1). */
export const MAX_VIEW_SECONDS = 1800

/**
 * The date v2 counting started (H-23): env ANALYTICS_V2_SINCE (YYYY-MM-DD),
 * else this constant. The owner sets the env to the real deploy date.
 */
export const ANALYTICS_V2_SINCE_DEFAULT = '2026-10-31'

export function trackingVersionSince(env: NodeJS.ProcessEnv = process.env): string {
  const v = String(env.ANALYTICS_V2_SINCE || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : ANALYTICS_V2_SINCE_DEFAULT
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

/** Host (or Android app package) → one canonical source name (audit M3). */
const ALIASES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\.android$/, 'linkedin.com'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$|^com\.twitter\.android$/, 'x.com'],
  [/(^|\.)google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$|^com\.google\.android\.(gm|googlequicksearchbox|apps\.[a-z.]+)$/, 'google.com'],
  [/(^|\.)facebook\.com$|^fb\.me$|^com\.facebook\.(katana|orca)$/, 'facebook.com'],
  [/(^|\.)instagram\.com$|^com\.instagram\.android$/, 'instagram.com'],
  [/(^|\.)bing\.com$/, 'bing.com'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo.com'],
  [/(^|\.)reddit\.com$|^com\.reddit\.frontpage$/, 'reddit.com'],
  [/(^|\.)github\.com$/, 'github.com']
]

/** Referrer → source label: canonical host, or "Direct" for none/own site. */
export function referrerSource(referrer: string | null | undefined): string {
  const raw = String(referrer ?? '').trim()
  if (!raw) return 'Direct'
  let host: string
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    // android-app://com.linkedin.android/ → the package name is the "host".
    host = url.hostname.toLowerCase()
  } catch {
    return 'Direct'
  }
  if (!host || (!host.includes('.') && host !== 'localhost')) return 'Direct'
  if (isOwnHost(host)) return 'Direct'
  host = host.replace(/^(www|m|mobile|l|lm)\./, '')
  for (const [re, name] of ALIASES) if (re.test(host)) return name
  return host
}

const capped = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_VIEW_SECONDS) : 0
}

export function summariseAnalytics(rows: PageViewRow[], days: number, now: Date = new Date()): AnalyticsSummary {
  const win = summaryWindow(days, now)
  const fromMs = Date.parse(win.fromIso)
  const toMs = Date.parse(win.toExclusiveIso)
  const inRange = rows.filter((r) => {
    const t = Date.parse(r.created_at)
    // Rows read before the user_agent column was selected have it undefined: keep them.
    const bot = r.user_agent !== undefined && isBotUserAgent(r.user_agent)
    return Number.isFinite(t) && t >= fromMs && t < toMs && !bot
  })

  // A row without a session is its own visit (legacy rows only).
  const visitKey = (r: PageViewRow, i: number) => (r.session_id ? `s:${r.session_id}` : `row:${i}`)

  const firstRowOfVisit = new Map<string, PageViewRow>()
  const firstUtmRowOfVisit = new Map<string, PageViewRow>()
  const dailySets = new Map<string, Set<string>>(win.dates.map((d) => [d, new Set<string>()]))
  const pages = new Map<string, { views: number; measured: number; duration: number; title: string | null; titleAt: number }>()
  let totalDuration = 0
  let measuredViews = 0

  inRange.forEach((r, i) => {
    const key = visitKey(r, i)
    const t = Date.parse(r.created_at)
    const first = firstRowOfVisit.get(key)
    if (!first || t < Date.parse(first.created_at)) firstRowOfVisit.set(key, r)
    if (r.utm_source || r.utm_medium || r.utm_campaign) {
      const u = firstUtmRowOfVisit.get(key)
      if (!u || t < Date.parse(u.created_at)) firstUtmRowOfVisit.set(key, r)
    }

    dailySets.get(new Date(r.created_at).toISOString().slice(0, 10))?.add(key)

    const duration = capped(r.visit_duration)
    totalDuration += duration
    if (duration > 0) measuredViews += 1

    const page = pages.get(r.page_path) || { views: 0, measured: 0, duration: 0, title: null, titleAt: -Infinity }
    page.views += 1
    page.duration += duration
    if (duration > 0) page.measured += 1
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

  const campaignCounts = new Map<string, { source: string | null; medium: string | null; campaign: string | null; visits: number }>()
  for (const r of firstUtmRowOfVisit.values()) {
    const c = { source: r.utm_source || null, medium: r.utm_medium || null, campaign: r.utm_campaign || null }
    const k = JSON.stringify(c)
    const entry = campaignCounts.get(k) || { ...c, visits: 0 }
    entry.visits += 1
    campaignCounts.set(k, entry)
  }

  const byCountThenName = <T>(count: (x: T) => number, name: (x: T) => string) => (a: T, b: T) =>
    count(b) - count(a) || (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0)

  return {
    range: { from: win.from, to: win.to, days },
    generatedAt: now.toISOString(),
    visits: firstRowOfVisit.size,
    pageViews: inRange.length,
    measuredViews,
    avgSecondsPerView: measuredViews ? Math.round(totalDuration / measuredViews) : 0,
    daily: win.dates.map((date) => ({ date, visits: dailySets.get(date)!.size })),
    pages: [...pages.entries()]
      .map(([path, p]) => ({
        path,
        title: p.title,
        views: p.views,
        measuredViews: p.measured,
        avgSeconds: p.measured ? Math.round(p.duration / p.measured) : 0
      }))
      .sort(byCountThenName((p) => p.views, (p) => p.path)),
    referrers: [...referrerCounts.entries()]
      .map(([source, visits]) => ({ source, visits }))
      .sort(byCountThenName((r) => r.visits, (r) => r.source)),
    campaigns: [...campaignCounts.values()].sort(
      byCountThenName((c) => c.visits, (c) => `${c.source ?? ''}|${c.medium ?? ''}|${c.campaign ?? ''}`)
    )
  }
}
