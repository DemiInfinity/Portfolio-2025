/**
 * QA acceptance: work history, education, certifications (T2, H-3, H-8 p6,
 * H-11) and learning + skills (T3, H-2).
 */
import request from 'supertest'
import { mockServices, authHeader } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

describe('QA T2 work history', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: {
      work_history: [{ id: 1, company: 'Cintra', position: 'Dev', location: 'UK', start_date: '2024-01-01', end_date: null, description: 'd', achievements: '["x"]', technologies: '[]', company_url: null, highlights: ['-80% effort'] }],
      cv_build: [{ id: 1, state: 'idle' }]
    } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('POST start_date YYYY-MM, end_date "", company_url "" → 201; payload 2025-08-01, null, null', async () => {
    const res = await request(app).post('/api/work-history').set(authHeader())
      .send({ company: 'A', position: 'B', start_date: '2025-08', end_date: '', company_url: '' })
    expect(res.status).toBe(201)
    const p = db.callsFor('work_history', 'insert')[0].payload
    expect(p.start_date).toBe('2025-08-01')
    expect(p.end_date).toBeNull()
    expect(p.company_url).toBeNull()
  })

  it('bad date → 400 details[0].path start_date', async () => {
    const res = await request(app).post('/api/work-history').set(authHeader()).send({ company: 'A', position: 'B', start_date: 'Aug 2025' })
    expectInvalid(res)
    expect(res.body.details[0].path).toBe('start_date')
  })

  it('no location/description → 201, highlights []', async () => {
    const res = await request(app).post('/api/work-history').set(authHeader()).send({ company: 'A', position: 'B', start_date: '2025-08-01' })
    expect(res.status).toBe(201)
    expect(res.body.data.highlights).toEqual([])
  })

  it('missing company/position/start_date → 400 naming each', async () => {
    const paths = expectInvalid(await request(app).post('/api/work-history').set(authHeader()).send({}))
    expect(paths).toEqual(expect.arrayContaining(['company', 'position', 'start_date']))
  })

  it('7 highlights → 400 path highlights; one of 61 chars → 400', async () => {
    const seven = Array.from({ length: 7 }, (_, i) => `h${i}`)
    expect(expectInvalid(await request(app).post('/api/work-history').set(authHeader())
      .send({ company: 'A', position: 'B', start_date: '2025-08', highlights: seven }))).toContain('highlights')
    expect(expectInvalid(await request(app).post('/api/work-history').set(authHeader())
      .send({ company: 'A', position: 'B', start_date: '2025-08', highlights: ['x'.repeat(61)] }))).toContain('highlights')
  })

  it('highlights "a\\nb" → stored ["a","b"]', async () => {
    await request(app).post('/api/work-history').set(authHeader()).send({ company: 'A', position: 'B', start_date: '2025-08', highlights: 'a\nb' })
    expect(db.callsFor('work_history', 'insert')[0].payload.highlights).toEqual(['a', 'b'])
  })

  it('company_url not http(s) → 400', async () => {
    expect(expectInvalid(await request(app).post('/api/work-history').set(authHeader())
      .send({ company: 'A', position: 'B', start_date: '2025-08', company_url: 'ftp://x.com' }))).toContain('company_url')
  })

  it('GET /api/work-history: arrays parsed, highlights always an array', async () => {
    db.rows('work_history').push({ id: 2, company: 'Old', position: 'P', start_date: '2020-01-01', end_date: '2021-01-01', achievements: 'not json', technologies: null })
    const res = await request(app).get('/api/work-history')
    expect(res.status).toBe(200)
    for (const r of res.body.data) {
      expect(Array.isArray(r.highlights)).toBe(true)
      expect(Array.isArray(r.achievements)).toBe(true)
      expect(Array.isArray(r.technologies)).toBe(true)
    }
  })

  it('PUT end_date null clears it', async () => {
    const res = await request(app).put('/api/work-history/1').set(authHeader())
      .send({ company: 'Cintra', position: 'Dev', start_date: '2024-01', end_date: '2025-03' })
    expect(res.status).toBe(200)
    const p = db.callsFor('work_history', 'update').find((c) => 'start_date' in c.payload)!.payload
    expect(p.end_date).toBe('2025-03-01')
  })
})

describe('QA T2 education and certifications', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { education: [], certifications: [], cv_build: [{ id: 1, state: 'idle' }] } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('education POST without institution → 400 path institution', async () => {
    const paths = expectInvalid(await request(app).post('/api/education').set(authHeader()).send({ degree: 'BSc', start_date: '2015-09' }))
    expect(paths).toContain('institution')
  })

  it('education POST minimal → 201, start_date YYYY-MM-01', async () => {
    const res = await request(app).post('/api/education').set(authHeader()).send({ institution: 'Uni', degree: 'BSc', start_date: '2015-09' })
    expect(res.status).toBe(201)
    expect(db.callsFor('education', 'insert')[0].payload.start_date).toBe('2015-09-01')
  })

  it('certifications POST without name → 400 Invalid input shape', async () => {
    const paths = expectInvalid(await request(app).post('/api/certifications').set(authHeader()).send({ issuer: 'X', issue_date: '2024-01' }))
    expect(paths).toContain('name')
  })

  it('certifications dates normalised, expiry "" → null', async () => {
    const res = await request(app).post('/api/certifications').set(authHeader()).send({ name: 'N', issuer: 'I', issue_date: '2024-02', expiry_date: '' })
    expect(res.status).toBe(201)
    const p = db.callsFor('certifications', 'insert')[0].payload
    expect(p.issue_date).toBe('2024-02-01')
    expect(p.expiry_date).toBeNull()
  })
})

describe('QA T3 learning and skills', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: {
      learning: [{ id: 1, title: 'TS', description: 'goal', provider: null, progress: 40, category: 'Dev', start_date: '2025-01-01', estimated_completion: null, resources: '[]', status: 'in_progress' }],
      skills: [{ id: 1, name: 'React', category: 'Frontend', level: 'expert', description: 'x' }],
      cv_build: [{ id: 1, state: 'idle' }]
    } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('POST minimal with provider → 201: provider Udemy, progress 0, status in_progress, start_date 2025-06-01, description null', async () => {
    const res = await request(app).post('/api/learning').set(authHeader()).send({ title: 'Rust', category: 'Dev', start_date: '2025-06', provider: 'Udemy' })
    expect(res.status).toBe(201)
    const p = db.callsFor('learning', 'insert')[0].payload
    expect(p).toEqual(expect.objectContaining({ provider: 'Udemy', progress: 0, status: 'in_progress', start_date: '2025-06-01', description: null }))
    expect(res.body.data.provider).toBe('Udemy')
  })

  it('POST missing title/category/start_date → 400 naming each', async () => {
    const paths = expectInvalid(await request(app).post('/api/learning').set(authHeader()).send({}))
    expect(paths).toEqual(expect.arrayContaining(['title', 'category', 'start_date']))
  })

  it('PUT {progress:100} → payload status completed', async () => {
    const res = await request(app).put('/api/learning/1').set(authHeader()).send({ progress: 100 })
    expect(res.status).toBe(200)
    expect(db.callsFor('learning', 'update')[0].payload).toEqual(expect.objectContaining({ progress: 100, status: 'completed' }))
  })

  it('PUT {status:"completed"} → payload progress 100', async () => {
    await request(app).put('/api/learning/1').set(authHeader()).send({ status: 'completed' })
    expect(db.callsFor('learning', 'update')[0].payload).toEqual(expect.objectContaining({ progress: 100, status: 'completed' }))
  })

  it('PUT {progress, status} partial (inline stepper) keeps both', async () => {
    await request(app).put('/api/learning/1').set(authHeader()).send({ progress: 60, status: 'paused' })
    expect(db.callsFor('learning', 'update')[0].payload).toEqual(expect.objectContaining({ progress: 60, status: 'paused' }))
  })

  it.each([[101], [-5], [12.5]])('progress %p → 400 path progress', async (progress) => {
    expect(expectInvalid(await request(app).put('/api/learning/1').set(authHeader()).send({ progress }))).toContain('progress')
  })

  it('provider over 120 → 400', async () => {
    expect(expectInvalid(await request(app).put('/api/learning/1').set(authHeader()).send({ provider: 'x'.repeat(121) }))).toContain('provider')
  })

  it('status not_started accepted; "done" rejected', async () => {
    expect((await request(app).put('/api/learning/1').set(authHeader()).send({ status: 'not_started' })).status).toBe(200)
    expect(expectInvalid(await request(app).put('/api/learning/1').set(authHeader()).send({ status: 'done' }))).toContain('status')
  })

  it('resources comma string → array', async () => {
    await request(app).post('/api/learning').set(authHeader()).send({ title: 'R', category: 'D', start_date: '2025-06-01', resources: 'a, b' })
    expect(db.callsFor('learning', 'insert')[0].payload.resources).toEqual(['a', 'b'])
  })

  it('GET /api/learning returns provider (null when unset) and description', async () => {
    const res = await request(app).get('/api/learning')
    expect(res.status).toBe(200)
    expect(res.body.data[0]).toEqual(expect.objectContaining({ provider: null, description: 'goal', progress: 40 }))
  })

  it('pre-migration: provider omitted on reads, dropped on writes, no 500', async () => {
    db = mockServices({ tables: { learning: [{ id: 1, title: 'T', category: 'D', start_date: '2025-01-01', progress: 0, status: 'in_progress' }], cv_build: [{ id: 1, state: 'idle' }] }, missingColumns: { learning: ['provider'] } })
    app = buildApp()
    expect((await request(app).get('/api/learning')).status).toBe(200)
    const res = await request(app).post('/api/learning').set(authHeader()).send({ title: 'X', category: 'D', start_date: '2025-06', provider: 'Udemy' })
    expect(res.status).toBe(201)
  })

  it('skills PUT description "" → 200, stored null', async () => {
    const res = await request(app).put('/api/skills/1').set(authHeader()).send({ description: '' })
    expect(res.status).toBe(200)
    expect(db.callsFor('skills', 'update')[0].payload.description).toBeNull()
  })
})
