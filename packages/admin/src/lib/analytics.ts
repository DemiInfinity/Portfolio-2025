import { MON, fmtDay, isoDay } from './format'

export type Summary = {
  range: { from: string; to: string; days: number }
  generatedAt: string
  visits: number
  pageViews: number
  avgSecondsPerView: number
  daily: { date: string; visits: number }[]
  pages: { path: string; title: string | null; views: number; avgSeconds: number; measuredViews?: number }[]
  referrers: { source: string; visits: number }[]
  /** H-23: page views with a measured duration (> 0); the average divides by this. */
  measuredViews?: number
  /** H-23: one row per visit that arrived with UTM values. */
  campaigns?: { source: string | null; medium: string | null; campaign: string | null; visits: number }[]
  /** H-23: YYYY-MM-DD when v2 counting started. */
  trackingVersionSince?: string
}

const n = (v: number) => v.toLocaleString('en-GB')
export const mmss = (s: number) => `${Math.floor(s / 60)} m ${String(Math.round(s) % 60).padStart(2, '0')} s`
const pct1 = (v: number, of: number) => (of ? ((v / of) * 100).toFixed(1) : '0.0') + '%'

const dayMon = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MON[m - 1]}`
}

const PATHS: Record<string, string> = { '/': 'Home', '/projects': 'Projects', '/experience': 'Experience', '/about': 'About', '/blog': 'Blog', '/learning': 'Learning' }
export const pageName = (p: { path: string; title: string | null }) => p.title || PATHS[p.path] || p.path

const SOURCES: Record<string, string> = { 'linkedin.com': 'LinkedIn', 'google.com': 'Google', 'github.com': 'GitHub', 'bing.com': 'Bing', 'duckduckgo.com': 'DuckDuckGo', 't.co': 'X', 'x.com': 'X' }

/** Y-axis top: the smallest of 10, 20, 40, 80, 100, 200, 400, 800, ... that is >= max. */
export const axisTop = (max: number) => {
  for (let p = 10; ; p *= 10) for (const m of [1, 2, 4, 8]) if (m * p >= max) return m * p
}

export function rangeLabel(from: string, to: string) {
  const fy = from.slice(0, 4)
  const ty = to.slice(0, 4)
  return fy === ty ? `${dayMon(from)} – ${fmtDay(to)}` : `${fmtDay(from)} – ${fmtDay(to)}`
}

export function stamp(generatedAt: string, now = new Date()) {
  const g = new Date(generatedAt)
  if (Number.isNaN(g.getTime())) return ''
  const hm = `${String(g.getHours()).padStart(2, '0')}:${String(g.getMinutes()).padStart(2, '0')}`
  return isoDay(g) === isoDay(now) ? `Updated today, ${hm}` : `Updated ${fmtDay(isoDay(g))}, ${hm}`
}

export function buildAnalytics(s: Summary, q = '') {
  const days = s.daily.length || s.range.days
  const counts = s.daily.map((d) => d.visits)
  const max = counts.length ? Math.max(...counts) : 0
  const min = counts.length ? Math.min(...counts) : 0
  const peakI = counts.indexOf(max)
  const top = axisTop(max)

  const refs = s.referrers.slice().sort((a, b) => b.visits - a.visits)
  const refTotal = refs.reduce((a, r) => a + r.visits, 0)
  const lead = refs.find((r) => r.source !== 'Direct')
  const peak = peakI >= 0 ? s.daily[peakI] : null
  let sub = rangeLabel(s.range.from, s.range.to) + '.'
  if (s.visits > 0 && peak) {
    const busiest = `the busiest day was ${dayMon(peak.date)} with ${peak.visits}.`
    sub += lead ? ` ${SOURCES[lead.source] || lead.source} brought ${Math.round((lead.visits / s.visits) * 100)}% of visits; ${busiest}` : ` ${busiest.charAt(0).toUpperCase()}${busiest.slice(1)}`
  }

  const posts = s.pages.filter((p) => p.path.startsWith('/blog/')).sort((a, b) => b.views - a.views)
  const post = posts[0]

  const kpis = [
    { label: 'Visits', value: n(s.visits), unit: '', caption: `${days ? Math.round(s.visits / days) : 0} a day on average` },
    { label: 'Page views', value: n(s.pageViews), unit: '', caption: `${(s.visits ? s.pageViews / s.visits : 0).toFixed(2)} pages per visit` },
    {
      label: 'Average time on a page',
      value: String(Math.floor(s.avgSecondsPerView / 60)),
      unit: `m ${String(s.avgSecondsPerView % 60).padStart(2, '0')} s`,
      // H-23: the average uses only views with a measured time.
      caption: typeof s.measuredViews === 'number' ? `Based on ${n(s.measuredViews)} ${s.measuredViews === 1 ? 'view' : 'views'} with a measured time` : 'Weighted by views',
    },
    post
      ? { label: 'Most read post', value: n(post.views), unit: 'views', caption: `${pageName(post)}, ${mmss(post.avgSeconds)} a read` }
      : { label: 'Most read post', value: '0', unit: 'views', caption: 'No post views yet' },
  ]

  const ticks = [0, 1, 2, 3, 4].map((k) => {
    const v = (top / 4) * k
    return { label: Number.isInteger(v) ? String(v) : v.toFixed(1), pos: k * 25 + '%', base: k === 0 }
  })

  const bars = s.daily.map((d, k) => ({
    key: d.date,
    label: dayMon(d.date),
    visits: d.visits,
    h: (d.visits / top) * 100 + '%',
    peak: k === peakI && max > 0,
    aria: `${dayMon(d.date)}, ${d.visits} visits`,
  }))

  const chartLabel = s.daily.length
    ? `Column chart of daily visits from ${dayMon(s.daily[0].date)} to ${fmtDay(s.daily[s.daily.length - 1].date)}, between ${min} and ${max} a day, peaking on ${peak ? dayMon(peak.date) : ''}.`
    : 'Column chart of daily visits, no data.'

  const xlabels = [0, 7, 14, 21, 28].filter((k) => k < s.daily.length).map((k) => ({ label: dayMon(s.daily[k].date), left: ((k + 0.5) / s.daily.length) * 100 + '%' }))

  const needle = q.trim().toLowerCase()
  const allPages = s.pages.slice().sort((a, b) => b.views - a.views)
  const matched = needle ? allPages.filter((p) => (pageName(p) + ' ' + p.path).toLowerCase().includes(needle)) : allPages
  const viewTotal = matched.reduce((a, p) => a + p.views, 0)
  const head = matched.slice(0, 6).map((p) => ({ name: pageName(p), path: p.path, views: n(p.views), share: pct1(p.views, viewTotal), time: mmss(p.avgSeconds) }))
  const rest = matched.slice(6)
  if (rest.length) {
    const rv = rest.reduce((a, p) => a + p.views, 0)
    const rt = rv ? Math.round(rest.reduce((a, p) => a + p.views * p.avgSeconds, 0) / rv) : 0
    head.push({ name: 'Other pages', path: `${rest.length} pages`, views: n(rv), share: pct1(rv, viewTotal), time: mmss(rt) })
  }

  const refHead = refs.slice(0, 4)
  const refRest = refs.slice(4)
  const refRows = refRest.length ? [...refHead, { source: 'Other', visits: refRest.reduce((a, r) => a + r.visits, 0) }] : refHead
  const first = refRows[0]?.visits || 1
  const referrers = refRows.map((r, k) => ({ name: r.source, visits: n(r.visits), share: pct1(r.visits, refTotal), w: (r.visits / first) * 88 + '%', top: k === 0 }))

  // H-23: figures before v2 counting over-count visits and under-count time.
  const since = s.trackingVersionSince && /^\d{4}-\d{2}-\d{2}/.test(s.trackingVersionSince) ? s.trackingVersionSince.slice(0, 10) : null
  const countingNote = since && s.range.from < since ? `Counting changed on ${fmtDay(since)}: earlier figures over-counted visits and under-counted time.` : null

  const camps = (s.campaigns || []).filter((c) => c.visits > 0).slice().sort((a, b) => b.visits - a.visits)
  const campTotal = camps.reduce((a, c) => a + c.visits, 0)
  const campaigns = camps.map((c, k) => ({
    key: `${c.source}|${c.medium}|${c.campaign}|${k}`,
    name: c.campaign || 'No campaign name',
    detail: [c.source, c.medium].filter(Boolean).join(' · ') || 'No source',
    visits: n(c.visits),
    share: pct1(c.visits, s.visits || campTotal),
    w: (c.visits / (camps[0]?.visits || 1)) * 88 + '%',
    top: k === 0,
  }))

  return {
    sub,
    countingNote,
    campaigns,
    kpis,
    ticks,
    bars,
    peak: peak && max > 0 ? { label: dayMon(peak.date), visits: peak.visits } : null,
    chartLabel,
    xlabels,
    pages: head,
    pageCount: matched.length,
    viewTotal: n(viewTotal),
    referrers,
    refTotal: n(refTotal),
    refMatches: refTotal === s.visits,
    empty: s.visits === 0,
  }
}
