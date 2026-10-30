import request from 'supertest'
import express from 'express'
import router from '../analytics'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

describe('Analytics API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    const today = new Date().toISOString().slice(0, 10)
    db = mockServices({
      tables: {
        analytics: [
          { id: 1, event_type: 'page_view', session_id: 's1', page_path: '/', page_title: 'Home', referrer: 'https://www.linkedin.com/x', visit_duration: 10, created_at: `${today}T00:30:00.000Z` },
          { id: 2, event_type: 'page_view', session_id: 's2', page_path: '/blog', page_title: 'Blog', referrer: '', visit_duration: 20, created_at: `${today}T00:40:00.000Z` },
          { id: 3, event_type: 'page_view', session_id: 's2', page_path: '/', page_title: 'Home', referrer: '', visit_duration: 0, created_at: `${today}T00:45:00.000Z` }
        ]
      }
    })
    app = express()
    app.use(express.json())
    app.use('/api/analytics', router)
  })
  afterEach(() => jest.restoreAllMocks())

  it('GET /summary: exact keys, 30 consecutive days ending today, referrers sum to visits', async () => {
    const res = await request(app).get('/api/analytics/summary').set(authHeader())
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(Object.keys(d).sort()).toEqual(['avgSecondsPerView', 'daily', 'generatedAt', 'pageViews', 'pages', 'range', 'referrers', 'visits'])
    expect(d.daily).toHaveLength(30)
    expect(d.daily[29].date).toBe(new Date().toISOString().slice(0, 10))
    for (let i = 1; i < 30; i++) {
      expect(Date.parse(d.daily[i].date) - Date.parse(d.daily[i - 1].date)).toBe(86400000)
    }
    expect(d.visits).toBe(2)
    expect(d.referrers.reduce((n: number, r: any) => n + r.visits, 0)).toBe(d.visits)
    expect(d.pages[0]).toMatchObject({ path: '/', views: 2, title: 'Home' })
    const call = db.callsFor('analytics', 'select')[0]
    expect(call.filters).toEqual(expect.arrayContaining([{ type: 'eq', column: 'event_type', value: 'page_view' }]))
    expect(call.range).toEqual([0, 999])
  })

  it.each([['0'], ['400'], ['abc']])('days=%s → 400', async (days) => {
    const res = await request(app).get(`/api/analytics/summary?days=${days}`).set(authHeader())
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
  })

  it('summary auth: 401 without token, 403 for viewer', async () => {
    expect((await request(app).get('/api/analytics/summary')).status).toBe(401)
    expect((await request(app).get('/api/analytics/summary').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
  })

  it('reads every page of rows', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const many = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, event_type: 'page_view', session_id: `s${i}`, page_path: '/', created_at: `${today}T00:00:00.000Z` }))
    db = mockServices({ tables: { analytics: many } })
    const res = await request(app).get('/api/analytics/summary?days=1').set(authHeader())
    expect(res.body.data.pageViews).toBe(2500)
    expect(db.callsFor('analytics', 'select').map((c) => c.range)).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('POST /track stores page_title', async () => {
    const res = await request(app).post('/api/analytics/track').send({ page_path: '/', session_id: 'new', page_title: 'Home' })
    expect(res.status).toBe(200)
    expect(db.callsFor('analytics', 'insert')[0].payload).toMatchObject({ page_title: 'Home', page_path: '/', event_type: 'page_view' })
  })

  it('POST /track accepts a text/plain JSON body (sendBeacon); rejects non-JSON text', async () => {
    const ok = await request(app).post('/api/analytics/track').set('Content-Type', 'text/plain')
      .send(JSON.stringify({ page_path: '/', session_id: 'beacon', page_title: 'Home' }))
    expect(ok.status).toBe(200)
    expect(db.callsFor('analytics', 'insert')[0].payload.session_id).toBe('beacon')
    const bad = await request(app).post('/api/analytics/track').set('Content-Type', 'text/plain').send('not json')
    expect(bad.status).toBe(400)
  })

  it('POST /track with duration updates the existing visit and its title', async () => {
    const res = await request(app).post('/api/analytics/track').send({ page_path: '/', session_id: 's1', visit_duration: 42, page_title: 'Home!' })
    expect(res.status).toBe(200)
    expect(db.callsFor('analytics', 'update')[0].payload).toMatchObject({ visit_duration: 42, page_title: 'Home!' })
  })
})
