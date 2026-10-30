import request from 'supertest'
import express from 'express'
import router from '../recommendations'
import * as cvDirty from '../../services/cvDirty'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Recommendations API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>
  let dirty: jest.SpyInstance

  beforeEach(() => {
    db = mockServices({
      tables: {
        recommendations: [
          { id: 1, quote: 'A', name: 'A', sort_order: 1, date: '2025-01-01', show_on_cv: false },
          { id: 2, quote: 'B', name: 'B', sort_order: 0, date: '2024-01-01', show_on_cv: true },
          { id: 3, quote: 'C', name: 'C', sort_order: 0, date: '2025-06-01', show_on_cv: false }
        ]
      }
    })
    dirty = jest.spyOn(cvDirty, 'markCvDirty').mockResolvedValue(undefined)
    app = express()
    app.use(express.json())
    app.use('/api/recommendations', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const post = (b: any) => request(app).post('/api/recommendations').set(authHeader()).send(b)

  it('GET orders by sort_order, then date desc', async () => {
    const res = await request(app).get('/api/recommendations')
    expect(res.body.data.map((r: any) => r.id)).toEqual([3, 2, 1])
  })

  it('GET /:id 404 for missing', async () => {
    expect((await request(app).get('/api/recommendations/9')).status).toBe(404)
    expect((await request(app).get('/api/recommendations/2')).body.data.name).toBe('B')
  })

  it('POST minimal → 201 with defaults; marks CV dirty', async () => {
    const res = await post({ quote: 'Q', name: 'N' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ quote: 'Q', name: 'N', show_on_cv: false, sort_order: 0, full_text: null })
    expect(dirty).toHaveBeenCalledTimes(1)
  })

  it('POST validation', async () => {
    const noQuote = await post({ name: 'N' })
    expect(noQuote.status).toBe(400)
    expect(noQuote.body.details[0].path).toBe('quote')
    expect((await post({ quote: 'Q', name: 'N', source_url: 'notaurl' })).body.details[0].path).toBe('source_url')
    await post({ quote: 'Q', name: 'N', date: '2025-01' })
    expect(db.callsFor('recommendations', 'insert').pop()!.payload.date).toBe('2025-01-01')
  })

  it('PUT partial; 404 missing', async () => {
    const res = await request(app).put('/api/recommendations/1').set(authHeader()).send({ show_on_cv: true })
    expect(res.status).toBe(200)
    expect(res.body.data.show_on_cv).toBe(true)
    expect((await request(app).put('/api/recommendations/99').set(authHeader()).send({ quote: 'x' })).status).toBe(404)
  })

  it('DELETE admin → 200; writes without a token → 401', async () => {
    expect((await request(app).delete('/api/recommendations/1').set(authHeader())).status).toBe(200)
    expect((await request(app).delete('/api/recommendations/2')).status).toBe(401)
    expect((await request(app).post('/api/recommendations').send({ quote: 'q', name: 'n' })).status).toBe(401)
  })
})
