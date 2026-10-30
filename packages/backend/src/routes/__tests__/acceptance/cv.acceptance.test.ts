/**
 * QA acceptance: CV aggregate (T10, H-12, H-16/H-17/H-19 extensions) and the
 * CV PDF build pipeline (T9, T16, H-5 as amended, H-21).
 * The PDF renderer is mocked in the build tests; storage is the fake bucket.
 */
import request from 'supertest'
import * as cvPdf from '../../../services/cvPdf'
import { setBackgroundRunner } from '../../../utils/background'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../../test/supabaseMock'
import { buildApp, withEnv, silenceConsole } from '../../../test/acceptanceApp'

const PDF_PATH = 'site/cv/Demi-Taylor-Nimmo-CV.pdf'

const aboutValue = {
  intro: ['Hi'], looking_for: { summary: 's', items: [] }, open_to_work_off_line: 'off',
  cv_headline: 'Engineer', cv_profile: 'Stored profile line', cv_ai_workflow: 'AI',
  contact: { email: 'a@b.co', linkedin_url: '', github_url: '', portfolio_url: '', location: 'UK' }
}

const cvTables = () => ({
  site_content: [{ key: 'about', value: aboutValue, updated_at: '2026-10-20T00:00:00Z' }],
  recommendations: [
    { id: 1, quote: 'Not on CV', name: 'X', show_on_cv: false, sort_order: 0, date: '2025-01-01', updated_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
    { id: 2, quote: 'Later', name: 'Y', show_on_cv: true, sort_order: 1, date: '2025-06-01', updated_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
    { id: 3, quote: 'First on CV', name: 'Adam', show_on_cv: true, sort_order: 0, date: '2025-01-01', updated_at: '2026-10-25T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }
  ],
  work_history: [
    { id: 1, company: 'Old Co', position: 'Dev', start_date: '2020-01-01', end_date: '2023-01-01', achievements: '["a"]', technologies: '[]', highlights: [], created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 2, company: 'Cintra', position: 'Engineer', start_date: '2023-02-01', end_date: null, achievements: '["b"]', technologies: '[]', highlights: ['-80%'], created_at: '2023-02-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 3, company: 'Mid Co', position: 'Dev', start_date: '2023-01-15', end_date: '2023-02-01', achievements: '[]', technologies: '[]', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' }
  ],
  skills: [
    { id: 1, name: 'React', category: 'Frontend', level: 'expert' },
    { id: 2, name: 'Node', category: 'Backend', level: 'advanced' },
    { id: 3, name: 'CSS', category: 'Frontend', level: 'advanced' }
  ],
  projects: [
    { id: 1, title: 'Public', slug: 'public', description: 'd', technologies: '["TS"]', status: 'completed', featured: false, show_on_site: true, live_url: null, role: null, platform: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: 2, title: 'Hidden', slug: 'hidden', description: 'd', technologies: '[]', status: 'completed', featured: true, show_on_site: false, created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
    { id: 3, title: 'Idea', slug: 'idea', description: 'd', technologies: '[]', status: 'ideas', featured: false, show_on_site: true, created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z' },
    { id: 4, title: 'Feat', slug: 'feat', description: 'd', technologies: '[]', status: 'in_development', featured: true, show_on_site: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
  ],
  education: [{ id: 1, institution: 'Uni', degree: 'BSc', start_date: '2015-09-01', achievements: '[]', created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z' }],
  learning: [
    { id: 1, title: 'Rust', provider: 'Udemy', description: 'goal', progress: 30, status: 'in_progress', category: 'D', start_date: '2025-01-01', estimated_completion: null },
    { id: 2, title: 'Done', provider: null, description: null, progress: 100, status: 'completed', category: 'D', start_date: '2024-01-01' },
    { id: 3, title: 'Next', provider: null, description: null, progress: 0, status: 'not_started', category: 'D', start_date: '2025-09-01' },
    { id: 4, title: 'Paused', provider: null, description: null, progress: 10, status: 'paused', category: 'D', start_date: '2025-02-01' }
  ],
  certifications: [
    { id: 1, name: 'Expired', issuer: 'I', issue_date: '2019-01-01', expiry_date: '2020-01-01', skills: '[]' },
    { id: 2, name: 'Valid', issuer: 'I', issue_date: '2024-01-01', expiry_date: null, skills: '[]' }
  ]
})

describe('QA GET /api/cv (H-12, T10)', () => {
  beforeEach(() => silenceConsole())
  afterEach(() => jest.restoreAllMocks())

  it('public, cached 5 min, exact top-level key set', async () => {
    mockServices({ tables: cvTables() })
    const res = await request(buildApp()).get('/api/cv')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(Object.keys(res.body.data).sort()).toEqual(
      ['certifications', 'counts', 'education', 'experience', 'learning', 'profile', 'projects', 'recommendation', 'skills', 'updated_at'])
  })

  it('profile from the about row: {cv_headline, cv_profile, cv_ai_workflow, contact}', async () => {
    mockServices({ tables: cvTables() })
    const { profile } = (await request(buildApp()).get('/api/cv')).body.data
    expect(profile.cv_profile).toBe('Stored profile line')
    expect(profile.cv_headline).toBe('Engineer')
    expect(Object.keys(profile).sort()).toEqual(['contact', 'cv_ai_workflow', 'cv_headline', 'cv_profile'])
  })

  it('recommendation = first show_on_cv by sort_order then date desc', async () => {
    mockServices({ tables: cvTables() })
    const { recommendation } = (await request(buildApp()).get('/api/cv')).body.data
    expect(recommendation.id).toBe(3)
    expect(recommendation.quote).toBe('First on CV')
  })

  it('no recommendations → recommendation null', async () => {
    mockServices({ tables: { ...cvTables(), recommendations: [] } })
    expect((await request(buildApp()).get('/api/cv')).body.data.recommendation).toBeNull()
  })

  it('experience: current first with current:true and highlights array; then start_date desc', async () => {
    mockServices({ tables: cvTables() })
    const { experience } = (await request(buildApp()).get('/api/cv')).body.data
    expect(experience.map((e: any) => e.id)).toEqual([2, 3, 1])
    expect(experience[0].current).toBe(true)
    expect(experience[1].current).toBe(false)
    expect(experience[0].highlights).toEqual(['-80%'])
    for (const e of experience) expect(Array.isArray(e.highlights)).toBe(true)
  })

  it('skills: two categories → two groups of {id,name,level}', async () => {
    mockServices({ tables: cvTables() })
    const { skills } = (await request(buildApp()).get('/api/cv')).body.data
    expect(skills.map((g: any) => g.category).sort()).toEqual(['Backend', 'Frontend'])
    const fe = skills.find((g: any) => g.category === 'Frontend')
    expect(fe.items.map((i: any) => i.name).sort()).toEqual(['CSS', 'React'])
    expect(Object.keys(fe.items[0]).sort()).toEqual(['id', 'level', 'name'])
  })

  it('projects: hidden and ideas excluded; featured first; contract fields', async () => {
    mockServices({ tables: cvTables() })
    const { projects } = (await request(buildApp()).get('/api/cv')).body.data
    expect(projects.map((p: any) => p.id)).toEqual([4, 1])
    expect(Object.keys(projects[0]).sort()).toEqual(
      ['description', 'featured', 'id', 'live_url', 'platform', 'role', 'slug', 'status', 'technologies', 'title'].sort())
    expect(projects[1].technologies).toEqual(['TS'])
  })

  it('learning: in_progress and not_started only, with the H-12 fields', async () => {
    mockServices({ tables: cvTables() })
    const { learning } = (await request(buildApp()).get('/api/cv')).body.data
    expect(learning.map((l: any) => l.id).sort()).toEqual([1, 3])
    expect(Object.keys(learning[0]).sort()).toEqual(
      ['description', 'estimated_completion', 'id', 'progress', 'provider', 'start_date', 'status', 'title'])
    expect(learning.find((l: any) => l.id === 1).provider).toBe('Udemy')
  })

  it('certifications: non-expired first; counts match each list', async () => {
    mockServices({ tables: cvTables() })
    const d = (await request(buildApp()).get('/api/cv')).body.data
    expect(d.certifications.map((c: any) => c.id)).toEqual([2, 1])
    expect(d.counts).toEqual(expect.objectContaining({
      experience: 3, projects: 2, skills: 3, education: 1, learning: 2, certifications: 2
    }))
  })

  it('updated_at = latest change across rows used, including recommendations and site_content', async () => {
    mockServices({ tables: cvTables() })
    const d = (await request(buildApp()).get('/api/cv')).body.data
    expect(new Date(d.updated_at).toISOString()).toBe('2026-10-25T00:00:00.000Z')
  })

  it('updated_at does not come from a hidden project', async () => {
    const t = cvTables()
    t.projects[1].updated_at = '2026-12-01T00:00:00Z' // hidden
    mockServices({ tables: t })
    const d = (await request(buildApp()).get('/api/cv')).body.data
    expect(new Date(d.updated_at).getTime()).toBeLessThan(Date.parse('2026-12-01T00:00:00Z'))
  })

  it.each(['work_history', 'skills', 'projects', 'education', 'learning', 'certifications', 'recommendations', 'site_content'])(
    '%s error → 500 {success:false}, no data', async (table) => {
      mockServices({ tables: cvTables(), errors: { [table]: { message: 'db down', code: 'XX000' } } })
      const res = await request(buildApp()).get('/api/cv')
      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
      expect(res.body.data).toBeUndefined()
    })

  it('before the v2 migration (no site_content / recommendations tables) → 200 with defaults, recommendation null', async () => {
    mockServices({
      tables: cvTables(),
      errors: {
        site_content: { code: '42P01', message: 'relation "site_content" does not exist' },
        recommendations: { code: '42P01', message: 'relation "recommendations" does not exist' }
      },
      missingColumns: { projects: ['show_on_site', 'case_study'] }
    })
    const res = await request(buildApp()).get('/api/cv')
    expect(res.status).toBe(200)
    expect(res.body.data.recommendation).toBeNull()
    expect(res.body.data.profile.cv_headline).toBe('Full-stack Software Engineer')
  })
})

describe('QA CV build: status, regenerate, Download CV (H-21, T16)', () => {
  let db: ReturnType<typeof mockServices>
  let render: jest.SpyInstance
  let tasks: (() => Promise<void>)[]
  let restore: () => void
  const row = (over: Record<string, any> = {}) => ({
    id: 1, state: 'idle', requested_at: null, started_at: null, generated_at: null, content_hash: null,
    pdf_path: null, size_bytes: null, error: null, ...over
  })
  const setup = (cvRow: any, storage: any = {}) => {
    db = mockServices({ tables: { ...cvTables(), cv_build: cvRow ? [cvRow] : [] }, storage })
  }

  beforeEach(() => {
    silenceConsole()
    restore = withEnv({ CV_DEBOUNCE_MS: undefined })
    tasks = []
    setBackgroundRunner((task) => { tasks.push(task) })
    render = jest.spyOn(cvPdf, 'renderCvPdf').mockResolvedValue(Buffer.from('%PDF-1.7 fake'))
  })
  afterEach(() => {
    restore()
    setBackgroundRunner(() => {})
    jest.restoreAllMocks()
  })
  const flush = async () => {
    while (tasks.length) await tasks.shift()!()
  }
  const uploads = () => (db.client.storage.from as jest.Mock).mock.results
    .flatMap((r: any) => r.value.upload.mock.calls)

  it('GET /api/cv/status: data keys exactly state, generatedAt, requestedAt, startedAt, error, pdfUrl, size', async () => {
    setup(row())
    const res = await request(buildApp()).get('/api/cv/status').set(authHeader())
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.data).sort()).toEqual(['error', 'generatedAt', 'pdfUrl', 'requestedAt', 'size', 'startedAt', 'state'])
    expect(res.body.data).toEqual({ state: 'idle', generatedAt: null, requestedAt: null, startedAt: null, error: null, pdfUrl: null, size: null })
  })

  it('GET /api/cv/status no token → 401, viewer → 403', async () => {
    setup(row())
    const app = buildApp()
    expect((await request(app).get('/api/cv/status')).status).toBe(401)
    expect((await request(app).get('/api/cv/status').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
  })

  it('GET /api/cv/status with no cv_build table (pre-migration) → 200, not 500', async () => {
    db = mockServices({ tables: cvTables(), errors: { cv_build: { code: '42P01', message: 'relation "cv_build" does not exist' } } })
    const res = await request(buildApp()).get('/api/cv/status').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.generatedAt).toBeNull()
  })

  it('POST /api/cv/regenerate → 200, upload to site/cv/Demi-Taylor-Nimmo-CV.pdf (application/pdf), state idle, generatedAt ISO', async () => {
    setup(row())
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.state).toBe('idle')
    expect(new Date(res.body.data.generatedAt).toISOString()).toBe(res.body.data.generatedAt)
    expect(res.body.data.size).toBe(Buffer.from('%PDF-1.7 fake').length)
    expect(res.body.data.pdfUrl).toContain(PDF_PATH)
    expect(res.body.data.pdfUrl).toMatch(/[?&]v=\d+/)
    const [p, , opts] = uploads()[0]
    expect(p).toBe(PDF_PATH)
    expect(opts).toEqual(expect.objectContaining({ contentType: 'application/pdf', upsert: true }))
  })

  it('POST /api/cv/regenerate with no cv_build row → creates it and builds', async () => {
    setup(null)
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.state).toBe('idle')
  })

  it('regenerate bypasses the hash check: twice → two renders, two uploads', async () => {
    setup(row())
    const app = buildApp()
    await request(app).post('/api/cv/regenerate').set(authHeader())
    await request(app).post('/api/cv/regenerate').set(authHeader())
    expect(render).toHaveBeenCalledTimes(2)
    expect(uploads()).toHaveLength(2)
  })

  it('renderer throws → 500 {success:false, error:"CV build failed", data:{state:"failed"}}', async () => {
    setup(row())
    render.mockRejectedValue(new Error('font missing'))
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('CV build failed')
    expect(res.body.data.state).toBe('failed')
    expect(Object.keys(res.body.data).sort()).toEqual(['error', 'generatedAt', 'pdfUrl', 'requestedAt', 'size', 'startedAt', 'state'])
  })

  it('storage upload fails → 500 CV build failed', async () => {
    db = mockServices({ tables: { ...cvTables(), cv_build: [row()] }, storageErrors: { upload: { message: 'bucket missing' } } })
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('CV build failed')
  })

  it('a failed build keeps serving the previous PDF (Download CV still available)', async () => {
    const gen = '2026-10-20T10:00:00.000Z'
    setup(row({ generated_at: gen, pdf_path: PDF_PATH, size_bytes: 1000 }), { 'portfolio-media': { [PDF_PATH]: { size: 1000 } } })
    render.mockRejectedValue(new Error('boom'))
    const app = buildApp()
    expect((await request(app).post('/api/cv/regenerate').set(authHeader())).status).toBe(500)
    const res = await request(app).get('/api/upload/resume')
    expect(res.body.available).toBe(true)
    expect(res.body.updatedAt).toBe(gen)
  })

  it('409 "A CV build is already running" while a fresh build holds the lock (<120 s), data = status', async () => {
    setup(row({ state: 'building', started_at: new Date(Date.now() - 30_000).toISOString() }))
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(409)
    expect(res.body).toEqual(expect.objectContaining({ success: false, error: 'A CV build is already running' }))
    expect(res.body.data.state).toBe('building')
    expect(render).not.toHaveBeenCalled()
  })

  it('a stale lock (>120 s) is taken over → 200', async () => {
    setup(row({ state: 'building', started_at: new Date(Date.now() - 200_000).toISOString() }))
    const res = await request(buildApp()).post('/api/cv/regenerate').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.state).toBe('idle')
  })

  it('regenerate no token → 401, viewer → 403, no render', async () => {
    setup(row())
    const app = buildApp()
    expect((await request(app).post('/api/cv/regenerate')).status).toBe(401)
    expect((await request(app).post('/api/cv/regenerate').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
    expect(render).not.toHaveBeenCalled()
  })

  it('debounce: a burst of three admin edits → exactly one render and one upload, after the last edit', async () => {
    restore = withEnv({ CV_DEBOUNCE_MS: '150' })
    setup(row())
    const app = buildApp()
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
    expect((await request(app).put('/api/projects/1').set(authHeader()).send({ title: 'A1' })).status).toBe(200)
    await pause(30)
    expect((await request(app).put('/api/work-history/2').set(authHeader()).send({ company: 'Cintra', position: 'Engineer', start_date: '2023-02' })).status).toBe(200)
    await pause(30)
    expect((await request(app).put('/api/content/about').set(authHeader()).send({ ...aboutValue, cv_profile: 'New line' })).status).toBe(200)
    expect(db.rows('cv_build')[0].state).toBe('pending')
    expect(render).not.toHaveBeenCalled()
    await flush()
    expect(render).toHaveBeenCalledTimes(1)
    expect(uploads()).toHaveLength(1)
    expect(db.rows('cv_build')[0].state).toBe('idle')
    // the one build used the content of the last edit
    expect(render.mock.calls[0][0].profile.cv_profile).toBe('New line')
  })

  it('debounce: an unchanged-content rebuild skips the upload', async () => {
    restore = withEnv({ CV_DEBOUNCE_MS: '10' })
    setup(row())
    const app = buildApp()
    expect((await request(app).post('/api/cv/regenerate').set(authHeader())).status).toBe(200)
    // a save that changes nothing the CV shows
    expect((await request(app).put('/api/skills/1').set(authHeader()).send({ name: 'React' })).status).toBe(200)
    await flush()
    expect(render).toHaveBeenCalledTimes(1)
    expect(uploads()).toHaveLength(1)
    expect(db.rows('cv_build')[0].state).toBe('idle')
  })

  it.each([
    ['/api/work-history/2', { company: 'Cintra', position: 'Engineer', start_date: '2023-02-01' }],
    ['/api/education/1', { institution: 'Uni', degree: 'BSc', start_date: '2015-09-01' }],
    ['/api/projects/1', { title: 'Public' }]
  ])('hash skip: a no-op save on %s after a build → no second upload', async (url, body) => {
    restore = withEnv({ CV_DEBOUNCE_MS: '10' })
    setup(row())
    const app = buildApp()
    expect((await request(app).post('/api/cv/regenerate').set(authHeader())).status).toBe(200)
    expect((await request(app).put(url).set(authHeader()).send(body)).status).toBe(200)
    await flush()
    expect(uploads()).toHaveLength(1)
  })

  it.each([
    ['post', '/api/work-history', { company: 'N', position: 'P', start_date: '2025-01' }],
    ['delete', '/api/work-history/1', {}],
    ['post', '/api/education', { institution: 'U', degree: 'D', start_date: '2025-01' }],
    ['post', '/api/certifications', { name: 'N', issuer: 'I', issue_date: '2025-01' }],
    ['put', '/api/learning/1', { progress: 50 }],
    ['post', '/api/skills', { name: 'Go', category: 'Backend', level: 'beginner' }],
    ['post', '/api/recommendations', { quote: 'Q', name: 'N' }],
    ['delete', '/api/projects/1', {}]
  ])('%s %s marks the CV pending', async (method, path, body) => {
    setup(row())
    const res = await (request(buildApp()) as any)[method](path).set(authHeader()).send(body)
    expect(res.status).toBeLessThan(300)
    expect(db.rows('cv_build')[0].state).toBe('pending')
    expect(tasks.length).toBeGreaterThan(0)
  })

  it('a failed (400) write does not mark the CV dirty', async () => {
    setup(row())
    await request(buildApp()).post('/api/projects').set(authHeader()).send({})
    expect(db.rows('cv_build')[0].state).toBe('idle')
  })

  describe('GET /api/upload/resume (H-21 amends H-5)', () => {
    it('generated → {success, available:true, name, path, size, updatedAt, url with v=}', async () => {
      const gen = '2026-10-29T08:00:00.000Z'
      setup(row({ generated_at: gen, pdf_path: PDF_PATH, size_bytes: 26000 }), { 'portfolio-media': { [PDF_PATH]: { size: 26000 } } })
      const res = await request(buildApp()).get('/api/upload/resume')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true, available: true, name: 'Demi-Taylor-Nimmo-CV.pdf', path: PDF_PATH, size: 26000, updatedAt: gen,
        url: expect.stringContaining(PDF_PATH)
      })
      expect(res.body.url).toContain(`v=${Date.parse(gen)}`)
      expect(res.body).not.toHaveProperty('data')
    })

    it('never generated → {success:true, available:false, url:null}', async () => {
      setup(row())
      const res = await request(buildApp()).get('/api/upload/resume')
      expect(res.body).toEqual({ success: true, available: false, url: null })
    })

    it('no cv_build table → available:false, not 500', async () => {
      db = mockServices({ tables: {}, errors: { cv_build: { code: '42P01', message: 'relation "cv_build" does not exist' } } })
      const res = await request(buildApp()).get('/api/upload/resume')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true, available: false, url: null })
    })

    it('the old uploaded site/resume.pdf is no longer served', async () => {
      setup(row(), { 'portfolio-media': { 'site/resume.pdf': { size: 188416 } } })
      const res = await request(buildApp()).get('/api/upload/resume')
      expect(res.body.available).toBe(false)
    })

    it('overdue pending row (>60 s) → a build is scheduled and runs', async () => {
      setup(row({ state: 'pending', requested_at: new Date(Date.now() - 90_000).toISOString() }))
      await request(buildApp()).get('/api/upload/resume')
      expect(tasks.length).toBe(1)
      await flush()
      expect(render).toHaveBeenCalledTimes(1)
      expect(db.rows('cv_build')[0].state).toBe('idle')
    })

    it('fresh pending row (<60 s) → nothing scheduled', async () => {
      setup(row({ state: 'pending', requested_at: new Date(Date.now() - 5_000).toISOString() }))
      await request(buildApp()).get('/api/upload/resume')
      expect(tasks.length).toBe(0)
    })

    it('status endpoint kicks a stale building lock', async () => {
      setup(row({ state: 'building', started_at: new Date(Date.now() - 300_000).toISOString() }))
      await request(buildApp()).get('/api/cv/status').set(authHeader())
      expect(tasks.length).toBe(1)
    })

    it('DELETE /api/upload/resume (deprecated): 401 without token; admin → remove called', async () => {
      setup(row(), { 'portfolio-media': { 'site/resume.pdf': { size: 1 } } })
      const app = buildApp()
      expect((await request(app).delete('/api/upload/resume')).status).toBe(401)
      const res = await request(app).delete('/api/upload/resume').set(authHeader())
      expect(res.status).toBe(200)
      expect(db.storage['portfolio-media']?.['site/resume.pdf']).toBeUndefined()
    })

    it('POST /api/upload/resume with a PNG → 400 Only PDF files are allowed', async () => {
      setup(row())
      const res = await request(buildApp()).post('/api/upload/resume').set(authHeader())
        .attach('resume', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'cv.png', contentType: 'image/png' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Only PDF files are allowed')
    })
  })
})
