import request from 'supertest'
import express from 'express'
import router from '../workHistory'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Work history API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({
      tables: {
        work_history: [
          {
            id: 1, company: 'Cintra', position: 'Dev', location: 'Remote', start_date: '2025-08-01', end_date: null,
            description: 'd', achievements: '["Did a thing"]', technologies: ['Angular'], company_url: null, highlights: []
          }
        ]
      }
    })
    app = express()
    app.use(express.json())
    app.use('/api/work-history', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const post = (body: any) => request(app).post('/api/work-history').set(authHeader()).send(body)
  const lastInsert = () => db.callsFor('work_history', 'insert').pop()!.payload

  it('normalises month dates, clears empty end date and company URL', async () => {
    const res = await post({ company: 'C', position: 'P', location: 'L', description: 'D', start_date: '2025-08', end_date: '', company_url: '' })
    expect(res.status).toBe(201)
    expect(lastInsert()).toMatchObject({ start_date: '2025-08-01', end_date: null, company_url: null })
  })

  it('rejects a bad start date with details[0].path start_date', async () => {
    const res = await post({ company: 'C', position: 'P', start_date: 'not a date' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    expect(res.body.details[0].path).toBe('start_date')
  })

  it('needs only company, position, start_date; highlights default to []', async () => {
    const res = await post({ company: 'C', position: 'P', start_date: '2024-06' })
    expect(res.status).toBe(201)
    expect(res.body.data.highlights).toEqual([])
    expect(lastInsert()).toMatchObject({ location: '', description: '' })
  })

  it.each([['company'], ['position'], ['start_date']])('missing %s → 400 with that path', async (field) => {
    const body: any = { company: 'C', position: 'P', start_date: '2024-06' }
    delete body[field]
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(res.body.details.map((d: any) => d.path)).toContain(field)
  })

  it('rejects 7 highlights and over-long highlights', async () => {
    const seven = await post({ company: 'C', position: 'P', start_date: '2024-06', highlights: ['1', '2', '3', '4', '5', '6', '7'] })
    expect(seven.status).toBe(400)
    expect(seven.body.details[0].path).toBe('highlights')
    const long = await post({ company: 'C', position: 'P', start_date: '2024-06', highlights: ['x'.repeat(61)] })
    expect(long.status).toBe(400)
  })

  it('accepts newline-separated highlights', async () => {
    const res = await post({ company: 'C', position: 'P', start_date: '2024-06', highlights: 'a\nb' })
    expect(res.status).toBe(201)
    expect(lastInsert().highlights).toEqual(['a', 'b'])
    expect(res.body.data.highlights).toEqual(['a', 'b'])
  })

  it('rejects a non-http company URL', async () => {
    const res = await post({ company: 'C', position: 'P', start_date: '2024-06', company_url: 'javascript:alert(1)' })
    expect(res.status).toBe(400)
    expect(res.body.details[0].path).toBe('company_url')
  })

  it('PUT end_date "" clears it (role becomes current) and is partial', async () => {
    db.rows('work_history')[0].end_date = '2025-01-01'
    const res = await request(app).put('/api/work-history/1').set(authHeader()).send({ end_date: '' })
    expect(res.status).toBe(200)
    const payload = db.callsFor('work_history', 'update')[0].payload
    expect(payload.end_date).toBeNull()
    expect(payload).not.toHaveProperty('company')
  })

  it('PUT on a missing id → 404', async () => {
    const res = await request(app).put('/api/work-history/99').set(authHeader()).send({ position: 'X' })
    expect(res.status).toBe(404)
  })

  it('reads always return arrays, including highlights', async () => {
    const res = await request(app).get('/api/work-history')
    expect(res.body.data[0]).toMatchObject({ achievements: ['Did a thing'], technologies: ['Angular'], highlights: [] })
  })

  it('works before the migration: no highlights column on read or write', async () => {
    db = mockServices({ tables: { work_history: [{ id: 1, company: 'A', position: 'B', start_date: '2020-01-01' }] }, missingColumns: { work_history: ['highlights'] } })
    const list = await request(app).get('/api/work-history')
    expect(list.status).toBe(200)
    expect(list.body.data[0].highlights).toEqual([])
    const created = await post({ company: 'C', position: 'P', start_date: '2024-06', highlights: ['x'] })
    expect(created.status).toBe(201)
    const one = await request(app).get('/api/work-history/1')
    expect(one.status).toBe(200)
  })
})
