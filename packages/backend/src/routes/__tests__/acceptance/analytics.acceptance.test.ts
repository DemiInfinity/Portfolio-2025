/**
 * QA acceptance: analytics. plan T7; H-1, H-15.
 * Updated by the backend Developer for H-23 (2026-10-30): averages are over
 * views with a measured time, new summary keys, page-until-empty reads, and
 * /track needs a browser User-Agent (empty or bot UAs are dropped with 204).
 */
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
import request from 'supertest'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

const DAY = 86_400_000
const todayStart = () => {
  const n = new Date()
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}
const at = (daysAgo: number, hour = 12, min = 0) => new Date(todayStart() - daysAgo * DAY + hour * 3_600_000 + min * 60_000).toISOString()
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10)

let nextId = 1
const view = (session_id: string | null, page_path: string, created_at: string, extra: Record<string, any> = {}) => ({
  id: nextId++, event_type: 'page_view', session_id, page_path, created_at, visit_duration: 0, referrer: null, page_title: null, ...extra
})

describe('QA analytics summary (H-1)', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>

  const fixture = () => [
    // s1: two pages today, LinkedIn, crosses no midnight
    view('s1', '/', at(0, 9), { referrer: 'https://www.linkedin.com/feed/', visit_duration: 30, page_title: 'Home' }),
    view('s1', '/projects', at(0, 9, 5), { referrer: 'https://www.demitaylornimmo.com/', visit_duration: 60, page_title: 'Projects' }),
    // s2: empty referrer → Direct
    view('s2', '/', at(2), { referrer: '', visit_duration: 10 }),
    // s3: own host as first row → Direct even though a later row has google
    view('s3', '/about', at(5, 8), { referrer: 'https://demitaylornimmo.com/', visit_duration: 20, page_title: 'About' }),
    view('s3', '/', at(5, 9), { referrer: 'https://google.com/search?q=x', visit_duration: 0 }),
    // s4: google
    view('s4', '/', at(10), { referrer: 'https://www.google.com/', visit_duration: 0, page_title: 'Home v2' }),
    // s5: preview host on vercel.app and localhost → Direct
    view('s5', '/blog', at(12), { referrer: 'https://portfolio-git-x.vercel.app/' }),
    view('s6', '/blog', at(12), { referrer: 'http://localhost:3000/' }),
    // subdomain of own host → Direct
    view('s7', '/blog', at(13), { referrer: 'https://admin.demitaylornimmo.com/x' }),
    // unparsable → Direct
    view('s8', '/blog', at(13), { referrer: '::::not a url' }),
    // two rows without a session = two visits
    view(null, '/', at(1)),
    view(null, '/', at(1)),
    // outside the 30-day window
    view('old', '/', at(30)),
    // not a page_view
    { id: nextId++, event_type: 'click', session_id: 'c1', page_path: '/', created_at: at(0) }
  ]

  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { analytics: fixture() } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('exact data key set and range', async () => {
    const res = await request(app).get('/api/analytics/summary').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Object.keys(res.body.data).sort()).toEqual(['avgSecondsPerView', 'campaigns', 'daily', 'generatedAt', 'measuredViews', 'pageViews', 'pages', 'range', 'referrers', 'trackingVersionSince', 'visits'])
    expect(res.body.data.range).toEqual({ from: ymd(todayStart() - 29 * DAY), to: ymd(todayStart()), days: 30 })
    expect(new Date(res.body.data.generatedAt).toString()).not.toBe('Invalid Date')
  })

  it('daily: exactly 30 consecutive ascending days ending today UTC, zero-filled', async () => {
    const { daily } = (await request(app).get('/api/analytics/summary').set(authHeader())).body.data
    expect(daily).toHaveLength(30)
    daily.forEach((d: any, i: number) => {
      expect(Object.keys(d).sort()).toEqual(['date', 'visits'])
      expect(d.date).toBe(ymd(todayStart() - (29 - i) * DAY))
    })
    const byDate = Object.fromEntries(daily.map((d: any) => [d.date, d.visits]))
    expect(byDate[ymd(todayStart())]).toBe(1) // s1
    expect(byDate[ymd(todayStart() - DAY)]).toBe(2) // two null sessions
    expect(byDate[ymd(todayStart() - 3 * DAY)]).toBe(0)
  })

  it('visits = distinct sessions (null session = 1 per row); pageViews = page_view rows in range', async () => {
    const d = (await request(app).get('/api/analytics/summary').set(authHeader())).body.data
    expect(d.visits).toBe(10) // s1..s8 + 2 null rows
    expect(d.pageViews).toBe(12)
    expect(d.measuredViews).toBe(4)
    expect(d.avgSecondsPerView).toBe(Math.round(120 / 4)) // H-23: over measured views only
  })

  it('referrers: per visit from the first row, host only without www, Direct bucket, desc, sum === visits', async () => {
    const d = (await request(app).get('/api/analytics/summary').set(authHeader())).body.data
    const sum = d.referrers.reduce((n: number, r: any) => n + r.visits, 0)
    expect(sum).toBe(d.visits)
    expect(d.referrers).toEqual([
      { source: 'Direct', visits: 8 },
      expect.objectContaining({ visits: 1 }),
      expect.objectContaining({ visits: 1 })
    ])
    expect(d.referrers.slice(1).map((r: any) => r.source).sort()).toEqual(['google.com', 'linkedin.com'])
  })

  it('pages: views desc, title = latest non-empty, avgSeconds per path', async () => {
    const d = (await request(app).get('/api/analytics/summary').set(authHeader())).body.data
    expect(d.pages[0]).toEqual({ path: '/', title: 'Home', views: 6, measuredViews: 2, avgSeconds: Math.round(40 / 2) })
    const views = d.pages.map((p: any) => p.views)
    expect([...views].sort((a, b) => b - a)).toEqual(views)
    const about = d.pages.find((p: any) => p.path === '/about')
    expect(about).toEqual({ path: '/about', title: 'About', views: 1, measuredViews: 1, avgSeconds: 20 })
    expect(d.pages.find((p: any) => p.path === '/blog').title).toBeNull()
  })

  it('no rows → zeros, 30 zero days, empty pages/referrers', async () => {
    mockServices({ tables: { analytics: [] } })
    const d = (await request(buildApp()).get('/api/analytics/summary?days=7').set(authHeader())).body.data
    expect(d).toEqual(expect.objectContaining({ visits: 0, pageViews: 0, avgSecondsPerView: 0, pages: [], referrers: [] }))
    expect(d.daily).toHaveLength(7)
    expect(d.daily.every((x: any) => x.visits === 0)).toBe(true)
  })

  it.each(['0', '400', 'abc', '1.5'])('days=%s → 400 Invalid input', async (days) => {
    expectInvalid(await request(app).get(`/api/analytics/summary?days=${days}`).set(authHeader()))
  })

  it('days=1 and days=365 accepted', async () => {
    expect((await request(app).get('/api/analytics/summary?days=1').set(authHeader())).body.data.daily).toHaveLength(1)
    expect((await request(app).get('/api/analytics/summary?days=365').set(authHeader())).body.data.daily).toHaveLength(365)
  })

  it('reads rows in 1000-row pages', async () => {
    const many = Array.from({ length: 1500 }, (_, i) => view(`m${i}`, '/', at(1)))
    db = mockServices({ tables: { analytics: many } })
    const d = (await request(buildApp()).get('/api/analytics/summary').set(authHeader())).body.data
    expect(d.visits).toBe(1500)
    const ranges = db.callsFor('analytics', 'select').map((c) => c.range)
    expect(ranges).toEqual([[0, 999], [1000, 1999], [1500, 2499]]) // H-23: pages until an empty page
  })

  it('no token → 401; non-admin → 403', async () => {
    expect((await request(app).get('/api/analytics/summary')).status).toBe(401)
    expect((await request(app).get('/api/analytics/summary').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
  })

  it('pre-migration (no page_title) → 200, titles null', async () => {
    mockServices({ tables: { analytics: fixture() }, missingColumns: { analytics: ['page_title'] } })
    const res = await request(buildApp()).get('/api/analytics/summary').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.pages.every((p: any) => p.title === null)).toBe(true)
  })

  it('/overview is kept (deprecated) and still 200 for admin', async () => {
    expect((await request(app).get('/api/analytics/overview').set(authHeader())).status).toBe(200)
  })
})

describe('QA analytics track (T7, H-15)', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { analytics: [] } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('stores page_title and an anonymised IP', async () => {
    const res = await request(app).post('/api/analytics/track').set('User-Agent', BROWSER_UA).set('X-Forwarded-For', '203.0.113.77')
      .send({ page_path: '/about', session_id: 's1', page_title: 'About · Demi' })
    expect(res.status).toBe(200)
    const p = db.callsFor('analytics', 'insert')[0].payload
    expect(p.page_title).toBe('About · Demi')
    expect(p.event_type).toBe('page_view')
    expect(p.ip_address).not.toBe('203.0.113.77')
  })

  it('text/plain JSON body (sendBeacon) → 200 and stored', async () => {
    const res = await request(app).post('/api/analytics/track').set('User-Agent', BROWSER_UA).set('Content-Type', 'text/plain')
      .send(JSON.stringify({ page_path: '/', session_id: 's2', page_title: 'Home' }))
    expect(res.status).toBe(200)
    expect(db.callsFor('analytics', 'insert')[0].payload).toEqual(expect.objectContaining({ page_path: '/', session_id: 's2', page_title: 'Home' }))
  })

  it('text/plain "not json" → 400', async () => {
    const res = await request(app).post('/api/analytics/track').set('User-Agent', BROWSER_UA).set('Content-Type', 'text/plain').send('not json')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(db.callsFor('analytics', 'insert')).toHaveLength(0)
  })

  it('missing page_path → 400 with the shared details shape [{path,msg}]', async () => {
    const res = await request(app).post('/api/analytics/track').set('User-Agent', BROWSER_UA).send({ session_id: 's' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    for (const d of res.body.details) expect(Object.keys(d).sort()).toEqual(['msg', 'path'])
  })

  it('duration update on the same session+path also stores page_title', async () => {
    db = mockServices({ tables: { analytics: [view('s9', '/x', at(0), { page_title: null })] } })
    app = buildApp()
    await request(app).post('/api/analytics/track').set('User-Agent', BROWSER_UA).send({ page_path: '/x', session_id: 's9', visit_duration: 42, page_title: 'X page' })
    const upd = db.callsFor('analytics', 'update')[0].payload
    expect(upd).toEqual(expect.objectContaining({ visit_duration: 42, page_title: 'X page' }))
  })
})
