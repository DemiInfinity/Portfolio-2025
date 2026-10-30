import request from 'supertest'
import express from 'express'
import learning from '../learning'
import skills from '../skills'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Learning and skills API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({
      tables: {
        learning: [
          { id: 1, title: 'AI', provider: null, description: 'Goal', progress: 10, category: 'AI', start_date: '2025-06-01', status: 'in_progress', resources: '["a"]', created_at: '2025-06-01T00:00:00Z' }
        ],
        skills: [{ id: 1, name: 'Angular', category: 'Frontend', level: 'expert', description: 'x' }]
      }
    })
    app = express()
    app.use(express.json())
    app.use('/api/learning', learning)
    app.use('/api/skills', skills)
  })
  afterEach(() => jest.restoreAllMocks())

  const put = (body: any) => request(app).put('/api/learning/1').set(authHeader()).send(body)
  const lastUpdate = () => db.callsFor('learning', 'update').pop()!.payload

  it('POST with only title, category, start_date (+provider, empty goal) → 201 with defaults', async () => {
    const res = await request(app).post('/api/learning').set(authHeader())
      .send({ title: 'X', category: 'AI', start_date: '2025-06', provider: 'Udemy', description: '' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ provider: 'Udemy', progress: 0, status: 'in_progress', start_date: '2025-06-01', description: null })
    expect(db.callsFor('learning', 'insert')[0].payload.description).toBeNull()
  })

  it('POST without category → 400 with path category', async () => {
    const res = await request(app).post('/api/learning').set(authHeader()).send({ title: 'X', start_date: '2025-06' })
    expect(res.status).toBe(400)
    expect(res.body.details.map((d: any) => d.path)).toContain('category')
  })

  it('POST resources as a comma string → array', async () => {
    await request(app).post('/api/learning').set(authHeader()).send({ title: 'X', category: 'AI', start_date: '2025-06', resources: 'a, b,' })
    expect(db.callsFor('learning', 'insert')[0].payload.resources).toEqual(['a', 'b'])
  })

  it('PUT {progress:100} → status completed', async () => {
    const res = await put({ progress: 100 })
    expect(res.status).toBe(200)
    expect(lastUpdate().status).toBe('completed')
  })

  it('PUT {status:"completed"} → progress 100', async () => {
    await put({ status: 'completed' })
    expect(lastUpdate().progress).toBe(100)
  })

  it('PUT {progress:100, status:"paused"} keeps the sent status', async () => {
    await put({ progress: 100, status: 'paused' })
    expect(lastUpdate()).toMatchObject({ progress: 100, status: 'paused' })
  })

  it.each([[101], [-5], [1.5], ['abc']])('PUT progress %p → 400', async (progress) => {
    const res = await put({ progress })
    expect(res.status).toBe(400)
    expect(res.body.details[0].path).toBe('progress')
  })

  it('PUT estimated_completion "" clears it; month input normalised', async () => {
    await put({ estimated_completion: '' })
    expect(lastUpdate().estimated_completion).toBeNull()
    await put({ estimated_completion: '2026-01' })
    expect(lastUpdate().estimated_completion).toBe('2026-01-01')
  })

  it('GET returns provider null and parses JSON-string resources', async () => {
    const res = await request(app).get('/api/learning')
    expect(res.body.data[0].provider).toBeNull()
    expect(res.body.data[0].resources).toEqual(['a'])
  })

  it('GET works before the migration (no provider column): provider omitted', async () => {
    db = mockServices({ tables: { learning: [{ id: 1, title: 'A', category: 'AI' }] }, missingColumns: { learning: ['provider'] } })
    const res = await request(app).get('/api/learning')
    expect(res.status).toBe(200)
    expect(res.body.data[0]).not.toHaveProperty('provider')
    const created = await request(app).post('/api/learning').set(authHeader()).send({ title: 'X', category: 'AI', start_date: '2025-06', provider: 'Udemy' })
    expect(created.status).toBe(201)
  })

  it('skills PUT description "" → 200 and stored null; only known fields written', async () => {
    const res = await request(app).put('/api/skills/1').set(authHeader()).send({ description: '', id: 9, extra: 'x' })
    expect(res.status).toBe(200)
    const payload = db.callsFor('skills', 'update')[0].payload
    expect(payload.description).toBeNull()
    expect(payload).not.toHaveProperty('extra')
    expect(payload).not.toHaveProperty('id')
  })

  it('skills PUT level must stay lowercase enum', async () => {
    const res = await request(app).put('/api/skills/1').set(authHeader()).send({ level: 'Expert' })
    expect(res.status).toBe(400)
  })
})
