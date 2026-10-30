import request from 'supertest'
import express from 'express'
import cvRouter from '../cv'
import uploadRouter from '../upload'
import projectsRouter from '../projects'
import * as cvPdf from '../../services/cvPdf'
import { CV_PDF_PATH } from '../../services/cvBuild'
import { setBackgroundRunner } from '../../utils/background'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

const idleRow = { id: 1, state: 'idle', requested_at: null, started_at: null, generated_at: null, content_hash: null, pdf_path: null, size_bytes: null, error: null }

describe('CV build routes', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>
  let render: jest.SpyInstance
  let scheduled: number

  beforeEach(() => {
    scheduled = 0
    setBackgroundRunner(() => {
      scheduled++
    })
    db = mockServices({ tables: { cv_build: [{ ...idleRow }], projects: [{ id: 1, title: 'A', slug: 'a', status: 'completed', created_at: '2025-01-01T00:00:00Z' }] } })
    render = jest.spyOn(cvPdf, 'renderCvPdf').mockResolvedValue(Buffer.from('%PDF-1.7 fake pdf'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    app = express()
    app.use(express.json())
    app.use('/api/cv', cvRouter)
    app.use('/api/upload', uploadRouter)
    app.use('/api/projects', projectsRouter)
  })
  afterEach(() => {
    setBackgroundRunner(() => {})
    jest.restoreAllMocks()
  })

  it('a CV-content write records cv_build state pending and schedules a build', async () => {
    const res = await request(app).put('/api/projects/1').set(authHeader()).send({ title: 'B' })
    expect(res.status).toBe(200)
    expect(db.callsFor('cv_build', 'update')[0].payload.state).toBe('pending')
    expect(scheduled).toBe(1)
  })

  it('GET /cv/status: exact keys; 401 / 403', async () => {
    const res = await request(app).get('/api/cv/status').set(authHeader())
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.data).sort()).toEqual(['error', 'generatedAt', 'pdfUrl', 'requestedAt', 'size', 'startedAt', 'state'])
    expect((await request(app).get('/api/cv/status')).status).toBe(401)
    expect((await request(app).get('/api/cv/status').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
  })

  it('POST /cv/regenerate: builds now, uploads the PDF, state idle', async () => {
    const res = await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.state).toBe('idle')
    expect(new Date(res.body.data.generatedAt).toISOString()).toBe(res.body.data.generatedAt)
    expect(res.body.data.pdfUrl).toMatch(/site\/cv\/Demi-Taylor-Nimmo-CV\.pdf\?v=\d+$/)
    const bucket = (db.client.storage.from as jest.Mock).mock.results.find((r: any) => r.value.upload.mock.calls.length)!.value
    const [p, , opts] = bucket.upload.mock.calls[0]
    expect(p).toBe('site/cv/Demi-Taylor-Nimmo-CV.pdf')
    expect(opts).toMatchObject({ contentType: 'application/pdf', upsert: true, cacheControl: '300' })
  })

  it('POST /cv/regenerate ignores the unchanged-content shortcut', async () => {
    await request(app).post('/api/cv/regenerate').set(authHeader())
    await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('POST /cv/regenerate: renderer throws → 500 CV build failed with state failed', async () => {
    render.mockRejectedValue(new Error('bad font'))
    const res = await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ success: false, error: 'CV build failed', data: { state: 'failed', error: 'bad font' } })
  })

  it('POST /cv/regenerate while a fresh build holds the lock → 409', async () => {
    db.rows('cv_build')[0] = { ...idleRow, state: 'building', started_at: new Date(Date.now() - 10_000).toISOString() }
    const res = await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ success: false, error: 'A CV build is already running', data: { state: 'building' } })
    expect(render).not.toHaveBeenCalled()
  })

  it('POST /cv/regenerate takes over a stale lock (> 120 s)', async () => {
    db.rows('cv_build')[0] = { ...idleRow, state: 'building', started_at: new Date(Date.now() - 200_000).toISOString() }
    const res = await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(200)
  })

  it('POST /cv/regenerate needs admin', async () => {
    expect((await request(app).post('/api/cv/regenerate')).status).toBe(401)
    expect((await request(app).post('/api/cv/regenerate').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
  })

  describe('GET /api/upload/resume (generated PDF)', () => {
    it('available once generated and the object exists', async () => {
      db = mockServices({
        tables: { cv_build: [{ ...idleRow, generated_at: '2026-10-27T09:12:00.000Z', pdf_path: CV_PDF_PATH, size_bytes: 188416 }] },
        storage: { 'portfolio-media': { [CV_PDF_PATH]: { size: 188416 } } }
      })
      const res = await request(app).get('/api/upload/resume')
      expect(res.body).toEqual({
        success: true,
        available: true,
        name: 'Demi-Taylor-Nimmo-CV.pdf',
        path: 'site/cv/Demi-Taylor-Nimmo-CV.pdf',
        size: 188416,
        updatedAt: '2026-10-27T09:12:00.000Z',
        url: `https://storage.test/portfolio-media/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=${Date.parse('2026-10-27T09:12:00.000Z')}`
      })
    })

    it('never generated → unavailable', async () => {
      const res = await request(app).get('/api/upload/resume')
      expect(res.body).toEqual({ success: true, available: false, url: null })
    })

    it('an uploaded site/resume.pdf alone is no longer served', async () => {
      db = mockServices({ tables: { cv_build: [{ ...idleRow }] }, storage: { 'portfolio-media': { 'site/resume.pdf': { size: 10 } } } })
      const res = await request(app).get('/api/upload/resume')
      expect(res.body.available).toBe(false)
    })

    it('generated but the object is missing → unavailable', async () => {
      db = mockServices({ tables: { cv_build: [{ ...idleRow, generated_at: '2026-10-27T09:12:00.000Z', pdf_path: CV_PDF_PATH }] } })
      expect((await request(app).get('/api/upload/resume')).body.available).toBe(false)
    })

    it('overdue pending row → a build is scheduled', async () => {
      db = mockServices({ tables: { cv_build: [{ ...idleRow, state: 'pending', requested_at: new Date(Date.now() - 90_000).toISOString() }] } })
      await request(app).get('/api/upload/resume')
      expect(scheduled).toBe(1)
    })

    it('before the v2 migration (no cv_build table) → unavailable, not 500', async () => {
      db = mockServices({ errors: { cv_build: { code: '42P01', message: 'relation "cv_build" does not exist' } } })
      const res = await request(app).get('/api/upload/resume')
      expect(res.status).toBe(200)
      expect(res.body.available).toBe(false)
    })
  })

  it('DELETE /api/upload/resume (deprecated): 401 without token; admin removes site/resume.pdf', async () => {
    expect((await request(app).delete('/api/upload/resume')).status).toBe(401)
    db = mockServices({ storage: { 'portfolio-media': { 'site/resume.pdf': { size: 1 } } } })
    const res = await request(app).delete('/api/upload/resume').set(authHeader())
    expect(res.body).toEqual({ success: true, message: 'CV removed' })
    expect(db.storage['portfolio-media']['site/resume.pdf']).toBeUndefined()
  })

  it('POST /api/upload/resume with a PNG → 400 Only PDF files are allowed', async () => {
    const res = await request(app).post('/api/upload/resume').set(authHeader())
      .attach('resume', Buffer.from('png'), { filename: 'x.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Only PDF files are allowed')
  })
})
