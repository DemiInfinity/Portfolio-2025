/**
 * QA acceptance: feature flags. plan T8; H-8 points 1-2, H-9 point 3, H-15.
 */
import request from 'supertest'
import { mockServices, authHeader } from '../../../test/supabaseMock'
import { buildApp, silenceConsole } from '../../../test/acceptanceApp'

describe('QA feature flags', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { feature_flags: [
      { id: 1, name: 'maintenance_mode', description: 'm', enabled: false },
      { id: 2, name: 'open_to_work', description: 'o', enabled: true },
      { id: 3, name: 'custom_one', description: 'c', enabled: true }
    ] } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('admin list includes the three built-ins (seeded when missing)', async () => {
    const res = await request(app).get('/api/feature-flags').set(authHeader())
    expect(res.status).toBe(200)
    const names = res.body.data.map((f: any) => f.name)
    expect(names).toEqual(expect.arrayContaining(['maintenance_mode', 'open_to_work', 'show_marbl', 'custom_one']))
  })

  it('POST "Show Reviews" → 400 with the key-rule message', async () => {
    const res = await request(app).post('/api/feature-flags').set(authHeader()).send({ name: 'Show Reviews' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ success: false, error: 'Flag keys use lower case letters, numbers and underscores.' }))
  })

  it.each(['1abc', 'a'.repeat(65), 'has-dash', ''])('POST name %p → 400', async (name) => {
    expect((await request(app).post('/api/feature-flags').set(authHeader()).send({ name })).status).toBe(400)
  })

  it('POST existing name → 409 "A flag called <name> already exists."', async () => {
    const res = await request(app).post('/api/feature-flags').set(authHeader()).send({ name: 'custom_one' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual(expect.objectContaining({ success: false, error: 'A flag called custom_one already exists.' }))
  })

  it('POST {name:"show_reviews", enabled:true} → 201, insert enabled:false', async () => {
    const res = await request(app).post('/api/feature-flags').set(authHeader()).send({ name: 'show_reviews', enabled: true })
    expect(res.status).toBe(201)
    expect(db.callsFor('feature_flags', 'insert')[0].payload.enabled).toBe(false)
    expect(res.body.data.enabled).toBe(false)
  })

  it('PUT {enabled, description} → 200; a different name → 400', async () => {
    const ok = await request(app).put('/api/feature-flags/3').set(authHeader()).send({ enabled: false, description: 'new' })
    expect(ok.status).toBe(200)
    expect(db.rows('feature_flags').find((f) => f.id === 3)).toEqual(expect.objectContaining({ enabled: false, description: 'new' }))
    const rename = await request(app).put('/api/feature-flags/3').set(authHeader()).send({ name: 'renamed' })
    expect(rename.status).toBe(400)
    expect(db.rows('feature_flags').find((f) => f.id === 3)!.name).toBe('custom_one')
  })

  it('PUT with the same name is allowed', async () => {
    expect((await request(app).put('/api/feature-flags/3').set(authHeader()).send({ name: 'custom_one', enabled: true })).status).toBe(200)
  })

  it('DELETE open_to_work → 400 Built-in flags cannot be deleted.; custom → 200', async () => {
    const res = await request(app).delete('/api/feature-flags/2').set(authHeader())
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Built-in flags cannot be deleted.')
    expect(db.rows('feature_flags').some((f) => f.id === 2)).toBe(true)
    expect((await request(app).delete('/api/feature-flags/3').set(authHeader())).status).toBe(200)
  })

  it('public map: 200 without token, {name:boolean}, built-ins default false', async () => {
    const res = await request(app).get('/api/feature-flags/public')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toEqual(expect.objectContaining({ maintenance_mode: false, open_to_work: true, show_marbl: false }))
    for (const v of Object.values(res.body.data)) expect(typeof v).toBe('boolean')
  })

  it('/public/open_to_work unchanged: {success, enabled} with no data', async () => {
    const res = await request(app).get('/api/feature-flags/public/open_to_work')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, enabled: true })
  })

  it('/maintenance → {success, maintenance_mode}', async () => {
    const res = await request(app).get('/api/feature-flags/maintenance')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, maintenance_mode: false })
  })
})
