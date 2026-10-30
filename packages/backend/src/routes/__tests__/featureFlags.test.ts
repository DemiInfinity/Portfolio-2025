import request from 'supertest'
import express from 'express'
import router from '../featureFlags'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Feature flags API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({
      tables: {
        feature_flags: [
          { id: 1, name: 'show_marbl', description: 'x', enabled: true },
          { id: 2, name: 'open_to_work', description: 'y', enabled: true },
          { id: 3, name: 'beta_features', description: 'z', enabled: false }
        ]
      }
    })
    app = express()
    app.use(express.json())
    app.use('/api/feature-flags', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const post = (b: any) => request(app).post('/api/feature-flags').set(authHeader()).send(b)

  it('POST key rules: bad key 400, duplicate 409, new flag forced off', async () => {
    const bad = await post({ name: 'Show Reviews' })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('Flag keys use lower case letters, numbers and underscores.')
    const dup = await post({ name: 'show_marbl' })
    expect(dup.status).toBe(409)
    expect(dup.body.error).toBe('A flag called show_marbl already exists.')
    const ok = await post({ name: 'show_reviews', enabled: true })
    expect(ok.status).toBe(201)
    expect(db.callsFor('feature_flags', 'insert')[0].payload.enabled).toBe(false)
  })

  it('PUT: rename → 400, same name ok, enabled → 200', async () => {
    expect((await request(app).put('/api/feature-flags/1').set(authHeader()).send({ name: 'other' })).status).toBe(400)
    expect((await request(app).put('/api/feature-flags/1').set(authHeader()).send({ name: 'show_marbl', enabled: false })).status).toBe(200)
    const res = await request(app).put('/api/feature-flags/1').set(authHeader()).send({ enabled: true })
    expect(res.status).toBe(200)
    expect(res.body.data.enabled).toBe(true)
    expect((await request(app).put('/api/feature-flags/99').set(authHeader()).send({ enabled: true })).status).toBe(404)
  })

  it('DELETE: built-in → 400, custom → 200', async () => {
    const builtIn = await request(app).delete('/api/feature-flags/2').set(authHeader())
    expect(builtIn.status).toBe(400)
    expect(builtIn.body.error).toBe('Built-in flags cannot be deleted.')
    expect((await request(app).delete('/api/feature-flags/3').set(authHeader())).status).toBe(200)
    expect(db.rows('feature_flags').map((f) => f.id)).toEqual([1, 2])
  })

  it('GET /public without a token: a map of booleans incl. missing built-ins as false', async () => {
    const res = await request(app).get('/api/feature-flags/public')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { maintenance_mode: false, open_to_work: true, show_marbl: true, beta_features: false } })
  })

  it('GET /public/:name unchanged', async () => {
    const res = await request(app).get('/api/feature-flags/public/open_to_work')
    expect(res.body).toEqual({ success: true, enabled: true })
    expect((await request(app).get('/api/feature-flags/public/nope')).body).toEqual({ success: true, enabled: false })
  })

  it('GET / (admin) seeds missing built-ins without changing existing values', async () => {
    const res = await request(app).get('/api/feature-flags').set(authHeader())
    expect(res.status).toBe(200)
    const names = res.body.data.map((f: any) => f.name)
    expect(names).toEqual(expect.arrayContaining(['maintenance_mode', 'open_to_work', 'show_marbl']))
    expect(res.body.data.find((f: any) => f.name === 'open_to_work').enabled).toBe(true)
  })
})
