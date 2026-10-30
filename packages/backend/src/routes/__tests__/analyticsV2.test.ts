import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import router from '../analytics'
import { referrerSource, summariseAnalytics, trackingVersionSince, ANALYTICS_V2_SINCE_DEFAULT } from '../../services/analyticsSummary'
import { mockServices, authHeader } from '../../test/supabaseMock'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

describe('Analytics tracking v2 (H-23)', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({ tables: { analytics: [] } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    app = express()
    app.use(express.json())
    app.use('/api/analytics', router)
  })
  afterEach(() => {
    delete process.env.ANALYTICS_V2_SINCE
    jest.restoreAllMocks()
  })

  const track = (body: any, ua = UA) => request(app).post('/api/analytics/track').set('User-Agent', ua).send(body)
  const pageView = (view_id: string, session_id: string, page_path: string, extra: any = {}) =>
    track({ event: 'page_view', view_id, session_id, page_path, ...extra })
  const update = (view_id: string, session_id: string, page_path: string, duration_seconds: number) =>
    track({ event: 'view_update', view_id, session_id, page_path, duration_seconds })
  const summary = async () => (await request(app).get('/api/analytics/summary').set(authHeader())).body.data
  const rows = () => db.rows('analytics')

  describe('ingest', () => {
    it('page_view → 201, one row with view_id, UTM lower-cased, title suffix stripped, IP anonymised', async () => {
      const id = randomUUID()
      const res = await pageView(id, 's1', '/projects', {
        page_title: 'Projects | Demi Taylor Nimmo', referrer: 'https://www.linkedin.com/', utm_source: ' LinkedIn ', utm_medium: 'Social', utm_campaign: 'Launch'
      }).set('X-Forwarded-For', '203.0.113.9')
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ success: true })
      expect(rows()).toHaveLength(1)
      expect(rows()[0]).toMatchObject({
        event_type: 'page_view', view_id: id, session_id: 's1', page_path: '/projects', page_title: 'Projects',
        referrer: 'https://www.linkedin.com/', utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'launch', visit_duration: 0
      })
      expect(rows()[0].ip_address).not.toBe('203.0.113.9')
    })

    it('page_view is idempotent per view_id', async () => {
      const id = randomUUID()
      expect((await pageView(id, 's1', '/')).status).toBe(201)
      const again = await pageView(id, 's1', '/')
      expect(again.status).toBe(200)
      expect(again.body).toEqual({ success: true, duplicate: true })
      expect(rows()).toHaveLength(1)
    })

    it('view_update: max(stored, new), capped at 1800, never creates rows', async () => {
      const id = randomUUID()
      await pageView(id, 's1', '/')
      expect((await update(id, 's1', '/', 40)).status).toBe(200)
      expect(rows()[0].visit_duration).toBe(40)
      await update(id, 's1', '/', 25) // smaller: ignored
      expect(rows()[0].visit_duration).toBe(40)
      await update(id, 's1', '/', 40) // repeat: no write
      await update(id, 's1', '/', 3600) // idle tab
      expect(rows()[0].visit_duration).toBe(1800)
      const unknown = await update(randomUUID(), 's1', '/', 10)
      expect(unknown.status).toBe(202)
      expect(unknown.body).toEqual({ success: true, ignored: true })
      expect(rows()).toHaveLength(1)
    })

    it('bots and empty user agents → 204, nothing stored', async () => {
      for (const ua of [GOOGLEBOT, 'LinkedInBot/1.0', 'HeadlessChrome/120', 'curl/8.4.0']) {
        const res = await pageView(randomUUID(), 's', '/', {}).set('User-Agent', ua)
        expect(res.status).toBe(204)
        expect(res.text).toBe('')
      }
      const empty = await request(app).post('/api/analytics/track').set('User-Agent', '').send({ event: 'page_view', view_id: randomUUID(), session_id: 's', page_path: '/' })
      expect(empty.status).toBe(204)
      expect(rows()).toHaveLength(0)
    })

    it.each([
      [{ event: 'page_view', view_id: 'nope', session_id: 's', page_path: '/' }, 'view_id'],
      [{ event: 'page_view', view_id: randomUUID(), session_id: 's', page_path: 'projects' }, 'page_path'],
      [{ event: 'page_view', view_id: randomUUID(), session_id: 's', page_path: '/a b' }, 'page_path'],
      [{ event: 'page_view', view_id: randomUUID(), session_id: 'x'.repeat(65), page_path: '/' }, 'session_id'],
      [{ event: 'view_update', view_id: randomUUID(), session_id: 's', page_path: '/', duration_seconds: -1 }, 'duration_seconds'],
      [{ event: 'view_update', view_id: randomUUID(), session_id: 's', page_path: '/' }, 'duration_seconds'],
      [{ event: 'click', view_id: randomUUID(), session_id: 's', page_path: '/' }, 'event'],
      [{ event: 'page_view', view_id: randomUUID(), session_id: 's', page_path: '/', utm_campaign: 'x'.repeat(201) }, 'utm_campaign']
    ])('invalid %p → 400 at %s', async (body, path) => {
      const res = await track(body)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid input')
      expect(res.body.details.map((d: any) => d.path)).toContain(path)
    })

    it('sendBeacon text/plain works for v2 events', async () => {
      const id = randomUUID()
      const res = await request(app).post('/api/analytics/track').set('User-Agent', UA).set('Content-Type', 'text/plain')
        .send(JSON.stringify({ event: 'page_view', view_id: id, session_id: 's', page_path: '/' }))
      expect(res.status).toBe(201)
    })

    it('legacy payload: a duration with no matching row is ignored (no fake page view); durations capped', async () => {
      const orphan = await track({ page_path: '/x', session_id: 'z', visit_duration: 30 })
      expect(orphan.status).toBe(202)
      expect(rows()).toHaveLength(0)
      expect((await track({ page_path: '/x', session_id: 'z' })).status).toBe(200)
      await track({ page_path: '/x', session_id: 'z', visit_duration: 99999 })
      expect((await track({ page_path: '/x', session_id: 'z', visit_duration: 86400 })).status).toBe(200)
      expect(rows()).toHaveLength(1)
      expect(rows()[0].visit_duration).toBe(1800)
    })

    it('before the migration: page_view stored without view_id/UTM; view_update matches by session + path', async () => {
      db = mockServices({ tables: { analytics: [] }, missingColumns: { analytics: ['view_id', 'utm_source', 'utm_medium', 'utm_campaign'] } })
      const id = randomUUID()
      expect((await pageView(id, 's1', '/', { utm_source: 'x' })).status).toBe(201)
      expect(rows()[0]).not.toHaveProperty('view_id')
      expect((await update(id, 's1', '/', 12)).status).toBe(200)
      expect(rows()[0].visit_duration).toBe(12)
      expect((await summary()).visits).toBe(1)
    })
  })

  describe('audit scenarios, end to end (track → summary)', () => {
    it('3-page visit (40, 60, 120 s): 1 visit, 3 views, average 73 s', async () => {
      const ids = [randomUUID(), randomUUID(), randomUUID()]
      await pageView(ids[0], 'v1', '/', { referrer: 'https://www.linkedin.com/feed/' })
      await update(ids[0], 'v1', '/', 40)
      await pageView(ids[1], 'v1', '/projects')
      await update(ids[1], 'v1', '/projects', 60)
      await pageView(ids[2], 'v1', '/blog/hello')
      await update(ids[2], 'v1', '/blog/hello', 120)
      const d = await summary()
      expect(d).toMatchObject({ visits: 1, pageViews: 3, measuredViews: 3, avgSecondsPerView: 73 })
      expect(d.referrers).toEqual([{ source: 'linkedin.com', visits: 1 }])
    })

    it('reload: same visit, a second view; still one visit', async () => {
      await pageView(randomUUID(), 'v1', '/', { referrer: 'https://google.com/' })
      await pageView(randomUUID(), 'v1', '/') // reload: new view_id, same session, no referrer
      const d = await summary()
      expect(d).toMatchObject({ visits: 1, pageViews: 2 })
      expect(d.referrers).toEqual([{ source: 'google.com', visits: 1 }])
    })

    it('back navigation: A 10 s, B 20 s, back to A 5 s → A totals 15 s over 2 views', async () => {
      const [a1, b, a2] = [randomUUID(), randomUUID(), randomUUID()]
      await pageView(a1, 'v1', '/a'); await update(a1, 'v1', '/a', 10)
      await pageView(b, 'v1', '/b'); await update(b, 'v1', '/b', 20)
      await pageView(a2, 'v1', '/a'); await update(a2, 'v1', '/a', 5)
      const d = await summary()
      const a = d.pages.find((p: any) => p.path === '/a')
      expect(a).toMatchObject({ views: 2, measuredViews: 2 })
      expect(a.avgSeconds * a.measuredViews).toBeCloseTo(15, -1)
      expect(d.visits).toBe(1)
    })

    it('tab switch: 20 s, hidden an hour, 10 s more → running total 30 s kept', async () => {
      const id = randomUUID()
      await pageView(id, 'v1', '/')
      await update(id, 'v1', '/', 20) // sent on hidden
      await update(id, 'v1', '/', 30) // running total on pagehide
      expect(rows()[0].visit_duration).toBe(30)
      expect((await summary()).avgSecondsPerView).toBe(30)
    })

    it('idle tab: an hour reported → capped at 1800 s', async () => {
      const id = randomUUID()
      await pageView(id, 'v1', '/')
      await update(id, 'v1', '/', 3600)
      expect((await summary()).avgSecondsPerView).toBe(1800)
    })

    it('a crawler visit is dropped and never counted', async () => {
      const id = randomUUID()
      await pageView(id, 'bot', '/').set('User-Agent', GOOGLEBOT)
      await update(id, 'bot', '/', 30).set('User-Agent', GOOGLEBOT)
      expect(rows()).toHaveLength(0)
      expect((await summary()).visits).toBe(0)
    })

    it('LinkedIn variants are merged into linkedin.com', async () => {
      const refs = ['https://www.linkedin.com/feed/', 'https://l.linkedin.com/?u=x', 'https://lnkd.in/abc', 'android-app://com.linkedin.android/']
      for (const [i, referrer] of refs.entries()) await pageView(randomUUID(), `li${i}`, '/', { referrer })
      const d = await summary()
      expect(d.referrers).toEqual([{ source: 'linkedin.com', visits: 4 }])
    })

    it('UTM campaigns breakdown', async () => {
      await pageView(randomUUID(), 'u1', '/', { utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'launch' })
      await pageView(randomUUID(), 'u1', '/projects')
      await pageView(randomUUID(), 'u2', '/', { utm_source: 'LinkedIn', utm_medium: 'social', utm_campaign: 'launch' })
      await pageView(randomUUID(), 'u3', '/', { utm_source: 'newsletter' })
      await pageView(randomUUID(), 'u4', '/')
      expect((await summary()).campaigns).toEqual([
        { source: 'linkedin', medium: 'social', campaign: 'launch', visits: 2 },
        { source: 'newsletter', medium: null, campaign: null, visits: 1 }
      ])
    })

    it('old bot rows in the database are excluded from the summary', async () => {
      const now = new Date().toISOString()
      db = mockServices({ tables: { analytics: [
        { id: 1, event_type: 'page_view', session_id: 'a', page_path: '/', user_agent: UA, created_at: now },
        { id: 2, event_type: 'page_view', session_id: 'b', page_path: '/', user_agent: GOOGLEBOT, created_at: now },
        { id: 3, event_type: 'page_view', session_id: 'c', page_path: '/', user_agent: '', created_at: now }
      ] } })
      expect(await summary()).toMatchObject({ visits: 1, pageViews: 1 })
    })
  })

  describe('summary helpers', () => {
    it.each([
      ['https://www.linkedin.com/feed', 'linkedin.com'],
      ['https://linkedin.com/in/x', 'linkedin.com'],
      ['https://l.linkedin.com/', 'linkedin.com'],
      ['https://lnkd.in/abc', 'linkedin.com'],
      ['android-app://com.linkedin.android/', 'linkedin.com'],
      ['https://t.co/xyz', 'x.com'],
      ['https://twitter.com/x', 'x.com'],
      ['https://www.google.co.uk/', 'google.com'],
      ['android-app://com.google.android.gm/', 'google.com'],
      ['https://m.facebook.com/', 'facebook.com'],
      ['https://www.bing.com/search', 'bing.com'],
      ['android-app://org.telegram.messenger/', 'org.telegram.messenger'],
      ['https://www.demitaylornimmo.com/projects', 'Direct'],
      ['https://admin.demitaylornimmo.com/', 'Direct'],
      ['', 'Direct']
    ])('%s → %s', (ref, out) => expect(referrerSource(ref)).toBe(out))

    it('caps durations at 1800 in the averages', () => {
      const now = new Date('2026-10-30T12:00:00Z')
      const s = summariseAnalytics([
        { session_id: 'a', page_path: '/', visit_duration: 7200, created_at: '2026-10-30T10:00:00Z' },
        { session_id: 'a', page_path: '/', visit_duration: 0, created_at: '2026-10-30T10:01:00Z' }
      ], 1, now)
      expect(s).toMatchObject({ measuredViews: 1, avgSecondsPerView: 1800 })
    })

    it('trackingVersionSince: env when valid, else the documented default', () => {
      expect(trackingVersionSince({} as any)).toBe(ANALYTICS_V2_SINCE_DEFAULT)
      expect(trackingVersionSince({ ANALYTICS_V2_SINCE: '2026-11-02' } as any)).toBe('2026-11-02')
      expect(trackingVersionSince({ ANALYTICS_V2_SINCE: 'soon' } as any)).toBe(ANALYTICS_V2_SINCE_DEFAULT)
    })

    it('summary response includes trackingVersionSince from env', async () => {
      process.env.ANALYTICS_V2_SINCE = '2026-11-02'
      expect((await summary()).trackingVersionSince).toBe('2026-11-02')
    })
  })
})
