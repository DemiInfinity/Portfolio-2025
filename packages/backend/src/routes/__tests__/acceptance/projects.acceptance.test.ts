/**
 * QA acceptance: projects. plan T0, T4, T14, T16 (dirty marker); H-3, H-4,
 * H-13, H-15, H-18, H-19, H-22.
 */
import request from 'supertest'
import { mockServices, authHeader } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

const base = (over: Record<string, any>) => ({
  description: 'd', content: 'legacy md', inspiration: null, image: null, images: '[]', technologies: '["React"]',
  github_url: null, live_url: null, featured: false, date: '2025-01-01', status: 'completed',
  role: null, platform: null, show_on_site: true, case_study: null,
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', ...over
})

describe('QA projects', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  const setup = (rows: any[]) => {
    db = mockServices({ tables: { projects: rows, cv_build: [{ id: 1, state: 'idle' }] } })
    app = buildApp()
  }
  beforeEach(() => silenceConsole())
  afterEach(() => jest.restoreAllMocks())

  describe('T0 / H-15 public list', () => {
    it('GET /api/projects with 2 rows → 200, arrays parsed, featured first', async () => {
      setup([
        base({ id: 1, title: 'Old', slug: 'old', created_at: '2025-03-01T00:00:00Z', images: '["a.png","b.png"]', technologies: 'React, Node' }),
        base({ id: 2, title: 'Feat', slug: 'feat', featured: true, created_at: '2024-01-01T00:00:00Z', technologies: ['TS'] })
      ])
      const res = await request(app).get('/api/projects')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.map((p: any) => p.id)).toEqual([2, 1])
      expect(res.body.data[1].images).toEqual(['a.png', 'b.png'])
      expect(Array.isArray(res.body.data[1].technologies)).toBe(true)
      expect(res.body.data[0].technologies).toEqual(['TS'])
    })

    it('non-featured rows are newest first (created_at desc)', async () => {
      setup([
        base({ id: 1, title: 'A', slug: 'a', created_at: '2025-01-01T00:00:00Z' }),
        base({ id: 2, title: 'B', slug: 'b', created_at: '2025-06-01T00:00:00Z' }),
        base({ id: 3, title: 'C', slug: 'c', created_at: '2025-03-01T00:00:00Z' })
      ])
      const res = await request(app).get('/api/projects')
      expect(res.body.data.map((p: any) => p.id)).toEqual([2, 3, 1])
    })

    it('list rows carry the H-15 fields plus role, platform, show_on_site, has_case_study, feature_titles; no content/case_study', async () => {
      setup([base({ id: 1, title: 'A', slug: 'a' })])
      const row = (await request(app).get('/api/projects')).body.data[0]
      for (const k of ['id', 'slug', 'title', 'description', 'image', 'images', 'technologies', 'github_url', 'live_url',
        'featured', 'date', 'status', 'inspiration', 'created_at', 'updated_at', 'role', 'platform', 'has_case_study', 'feature_titles']) {
        expect(row).toHaveProperty(k)
      }
      expect(row).not.toHaveProperty('content')
      expect(row).not.toHaveProperty('case_study')
    })
  })

  describe('T14 / H-19 visibility', () => {
    const rows = () => [
      base({ id: 1, title: 'Visible', slug: 'visible', status: 'in_development' }),
      base({ id: 2, title: 'Idea', slug: 'idea', status: 'ideas', show_on_site: true }),
      base({ id: 3, title: 'Hidden', slug: 'hidden', status: 'completed', show_on_site: false })
    ]

    it('public list returns only show_on_site AND status<>ideas', async () => {
      setup(rows())
      const res = await request(app).get('/api/projects')
      expect(res.body.data.map((p: any) => p.id)).toEqual([1])
    })

    it.each([
      ['/api/projects/slug/hidden'], ['/api/projects/slug/idea'], ['/api/projects/3'], ['/api/projects/2']
    ])('GET %s (non-public) → 404', async (path) => {
      setup(rows())
      const res = await request(app).get(path)
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    it('GET /api/projects/slug/missing → 404; GET /api/projects/999 → 404', async () => {
      setup(rows())
      expect((await request(app).get('/api/projects/slug/missing')).status).toBe(404)
      expect((await request(app).get('/api/projects/999')).status).toBe(404)
    })

    it('single public read includes content, case_study (null), role, platform, show_on_site', async () => {
      setup(rows())
      for (const path of ['/api/projects/slug/visible', '/api/projects/1']) {
        const res = await request(app).get(path)
        expect(res.status).toBe(200)
        expect(res.body.data).toEqual(expect.objectContaining({ id: 1, content: 'legacy md', case_study: null, role: null, platform: null, show_on_site: true }))
      }
    })

    it('/admin/all with admin → all 3 with show_on_site and has_case_study, no case_study/content', async () => {
      setup(rows())
      const res = await request(app).get('/api/projects/admin/all').set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data.map((p: any) => p.id).sort()).toEqual([1, 2, 3])
      for (const p of res.body.data) {
        expect(typeof p.show_on_site).toBe('boolean')
        expect(typeof p.has_case_study).toBe('boolean')
        expect(Array.isArray(p.feature_titles)).toBe(true)
        expect(p).not.toHaveProperty('case_study')
        expect(p).not.toHaveProperty('content')
      }
    })

    it('/admin/all orders featured first then created_at desc', async () => {
      setup([
        base({ id: 1, title: 'A', slug: 'a', created_at: '2025-01-01T00:00:00Z' }),
        base({ id: 2, title: 'B', slug: 'b', created_at: '2025-06-01T00:00:00Z', show_on_site: false }),
        base({ id: 3, title: 'C', slug: 'c', created_at: '2024-01-01T00:00:00Z', featured: true, status: 'ideas' })
      ])
      const res = await request(app).get('/api/projects/admin/all').set(authHeader())
      expect(res.body.data.map((p: any) => p.id)).toEqual([3, 2, 1])
    })

    it('/admin/:id hidden → 200 with case_study and content; missing → 404', async () => {
      const cs = { overview: 'O' }
      setup([...rows().slice(0, 2), base({ id: 3, title: 'Hidden', slug: 'hidden', show_on_site: false, case_study: cs })])
      const res = await request(app).get('/api/projects/admin/3').set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data.case_study).toEqual(cs)
      expect(res.body.data.content).toBe('legacy md')
      expect((await request(app).get('/api/projects/admin/999').set(authHeader())).status).toBe(404)
    })
  })

  describe('T14 / H-18 / H-22 case study on lists', () => {
    it('has_case_study true when overview set; feature_titles in order; [] when null', async () => {
      setup([
        base({ id: 1, title: 'A', slug: 'a', case_study: { overview: 'Hello', features: [{ title: 'A' }, { title: 'B', body: 'x' }] } }),
        base({ id: 2, title: 'B', slug: 'b', case_study: null }),
        base({ id: 3, title: 'C', slug: 'c', case_study: { problem: 'only a problem' } })
      ])
      for (const path of ['/api/projects', '/api/projects/admin/all']) {
        const res = await request(app).get(path).set(authHeader())
        const byId = Object.fromEntries(res.body.data.map((p: any) => [p.id, p]))
        expect(byId[1].has_case_study).toBe(true)
        expect(byId[1].feature_titles).toEqual(['A', 'B'])
        expect(byId[2].has_case_study).toBe(false)
        expect(byId[2].feature_titles).toEqual([])
        expect(byId[3].has_case_study).toBe(false)
        expect(byId[3].feature_titles).toEqual([])
        for (const p of res.body.data) expect(p).not.toHaveProperty('case_study')
      }
    })

    it('feature_titles is [] before the v2 migration (case_study column missing)', async () => {
      db = mockServices({ tables: { projects: [base({ id: 1, title: 'A', slug: 'a' })] }, missingColumns: { projects: ['case_study', 'show_on_site'] } })
      app = buildApp()
      const res = await request(app).get('/api/projects')
      expect(res.status).toBe(200)
      expect(res.body.data[0].feature_titles).toEqual([])
      expect(res.body.data[0].has_case_study).toBe(false)
    })

    it('case_study stored as a JSON string is still read', async () => {
      setup([base({ id: 1, title: 'A', slug: 'a', case_study: JSON.stringify({ overview: 'O', features: [{ title: 'F1' }] }) })])
      const row = (await request(app).get('/api/projects')).body.data[0]
      expect(row.has_case_study).toBe(true)
      expect(row.feature_titles).toEqual(['F1'])
    })
  })

  describe('T4 / T14 writes', () => {
    beforeEach(() => setup([
      base({ id: 1, title: 'One', slug: 'one', featured: true }),
      base({ id: 2, title: 'Two', slug: 'two' }),
      base({ id: 3, title: 'Three', slug: 'three', featured: true })
    ]))

    it('PUT {featured:true} on 2 while 1 and 3 featured → unfeatured [1,3]; only 2 featured', async () => {
      const res = await request(app).put('/api/projects/2').set(authHeader()).send({ featured: true })
      expect(res.status).toBe(200)
      expect([...res.body.data.unfeatured].sort()).toEqual([1, 3])
      expect(db.rows('projects').filter((p) => p.featured).map((p) => p.id)).toEqual([2])
    })

    it('PUT {featured:false} touches only that record, unfeatured []', async () => {
      const res = await request(app).put('/api/projects/1').set(authHeader()).send({ featured: false })
      expect(res.status).toBe(200)
      expect(res.body.data.unfeatured).toEqual([])
      expect(db.rows('projects').find((p) => p.id === 3)!.featured).toBe(true)
    })

    it('POST {title:"T", featured:true} → 201, others cleared, unfeatured listed', async () => {
      const res = await request(app).post('/api/projects').set(authHeader()).send({ title: 'T', featured: true })
      expect(res.status).toBe(201)
      expect([...res.body.data.unfeatured].sort()).toEqual([1, 3])
      expect(db.rows('projects').filter((p) => p.featured).map((p) => p.title)).toEqual(['T'])
    })

    it('POST {title:"T"} → 201; description "", show_on_site true; unfeatured []', async () => {
      const res = await request(app).post('/api/projects').set(authHeader()).send({ title: 'T' })
      expect(res.status).toBe(201)
      expect(res.body.data.unfeatured).toEqual([])
      const insert = db.callsFor('projects', 'insert')[0].payload
      expect(insert.description).toBe('')
      expect(insert.show_on_site).toBe(true)
    })

    it('POST without title → 400 path title', async () => {
      const paths = expectInvalid(await request(app).post('/api/projects').set(authHeader()).send({ description: 'x' }))
      expect(paths).toContain('title')
    })

    it('status:"idea" → 400 path status', async () => {
      const paths = expectInvalid(await request(app).post('/api/projects').set(authHeader()).send({ title: 'T', status: 'idea' }))
      expect(paths).toContain('status')
    })

    it('PUT technologies:[] → 200; stored as an array', async () => {
      const res = await request(app).put('/api/projects/2').set(authHeader()).send({ technologies: [] })
      expect(res.status).toBe(200)
      const upd = db.callsFor('projects', 'update').find((c) => 'technologies' in (c.payload || {}))!.payload
      expect(upd.technologies).toEqual([])
    })

    it('technologies comma string and images newline string → stored arrays', async () => {
      const res = await request(app).post('/api/projects').set(authHeader()).send({ title: 'T', technologies: 'React, Node', images: 'a.png\nb.png' })
      expect(res.status).toBe(201)
      const insert = db.callsFor('projects', 'insert')[0].payload
      expect(insert.technologies).toEqual(['React', 'Node'])
      expect(insert.images).toEqual(['a.png', 'b.png'])
    })

    it('PUT slug "Bad Slug" → 400 Invalid slug (not 500)', async () => {
      const res = await request(app).put('/api/projects/2').set(authHeader()).send({ slug: 'Bad Slug' })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Invalid slug')
    })

    it('H-13 role/platform: "" → null; ≤120 ok; 121 → 400', async () => {
      const ok = await request(app).put('/api/projects/2').set(authHeader()).send({ role: '', platform: 'Desktop app and web' })
      expect(ok.status).toBe(200)
      const upd = db.callsFor('projects', 'update').find((c) => 'role' in (c.payload || {}))!.payload
      expect(upd.role).toBeNull()
      expect(upd.platform).toBe('Desktop app and web')
      const paths = expectInvalid(await request(app).put('/api/projects/2').set(authHeader()).send({ role: 'x'.repeat(121) }))
      expect(paths).toContain('role')
    })

    it('PUT on a missing id → 404', async () => {
      const res = await request(app).put('/api/projects/999').set(authHeader()).send({ title: 'X' })
      expect(res.status).toBe(404)
    })

    it('PUT case_study {overview, metrics} → 200, stored normalised (trimmed)', async () => {
      const res = await request(app).put('/api/projects/2').set(authHeader())
        .send({ case_study: { overview: '  O  ', metrics: [{ value: '30%', label: 'lower costs' }] } })
      expect(res.status).toBe(200)
      expect(db.rows('projects').find((p) => p.id === 2)!.case_study).toEqual({ overview: 'O', metrics: [{ value: '30%', label: 'lower costs' }] })
    })

    it('case_study drops empty items: process [{title:"",body:""}] → process []', async () => {
      const res = await request(app).put('/api/projects/2').set(authHeader())
        .send({ case_study: { overview: 'O', process: [{ title: '', body: '' }], metrics: [{ value: '', label: 'x' }] } })
      expect(res.status).toBe(200)
      const cs = db.rows('projects').find((p) => p.id === 2)!.case_study
      expect(cs.process ?? []).toEqual([])
      expect(cs.metrics ?? []).toEqual([])
    })

    it('case_study {foo:1} → 400 path starts case_study', async () => {
      const paths = expectInvalid(await request(app).put('/api/projects/2').set(authHeader()).send({ case_study: { foo: 1 } }))
      expect(paths.some((p) => p.startsWith('case_study'))).toBe(true)
    })

    it('case_study wrong type in a list item → 400 with an indexed path', async () => {
      const paths = expectInvalid(await request(app).put('/api/projects/2').set(authHeader())
        .send({ case_study: { process: [{ title: 'ok' }, { title: 5 }] } }))
      expect(paths).toContain('case_study.process[1].title')
    })

    it('case_study over-long how_might_we (301) → 400', async () => {
      const paths = expectInvalid(await request(app).put('/api/projects/2').set(authHeader())
        .send({ case_study: { how_might_we: 'x'.repeat(301) } }))
      expect(paths.some((p) => p.startsWith('case_study.how_might_we'))).toBe(true)
    })

    it('case_study:null → stored null', async () => {
      db.rows('projects').find((p) => p.id === 2)!.case_study = { overview: 'O' }
      const res = await request(app).put('/api/projects/2').set(authHeader()).send({ case_study: null })
      expect(res.status).toBe(200)
      expect(db.rows('projects').find((p) => p.id === 2)!.case_study).toBeNull()
    })

    it('full H-18 shape round-trips through PUT and /admin/:id', async () => {
      const cs = {
        overview: 'O', problem: 'P', how_might_we: 'HMW',
        process: [{ label: 'Discover', title: 'Talking', body: 'b', image: 'https://x.test/a.png', image_alt: 'alt' }],
        architecture: { summary: 'S', steps: [{ title: 'Electron app', detail: 'Desktop shell' }] },
        features: [{ title: 'Profiles', body: 'b', image: null, image_alt: '' }],
        challenges: [{ title: 'One codebase', solution: 's' }],
        metrics: [{ value: '30%', label: 'lower costs' }],
        learned: 'L'
      }
      const res = await request(app).put('/api/projects/2').set(authHeader()).send({ case_study: cs })
      expect(res.status).toBe(200)
      const read = await request(app).get('/api/projects/admin/2').set(authHeader())
      expect(read.body.data.case_study.overview).toBe('O')
      expect(read.body.data.case_study.process[0]).toEqual(expect.objectContaining({ label: 'Discover', title: 'Talking', image: 'https://x.test/a.png' }))
      expect(read.body.data.case_study.architecture.steps).toEqual([{ title: 'Electron app', detail: 'Desktop shell' }])
      expect(read.body.data.case_study.challenges).toEqual([{ title: 'One codebase', solution: 's' }])
      expect(read.body.data.case_study.learned).toBe('L')
    })

    it('POST show_on_site:false is stored', async () => {
      await request(app).post('/api/projects').set(authHeader()).send({ title: 'T', show_on_site: false })
      expect(db.callsFor('projects', 'insert')[0].payload.show_on_site).toBe(false)
    })

    it('T16: PUT /api/projects/1 (admin) → 200 and cv_build update state pending', async () => {
      const res = await request(app).put('/api/projects/1').set(authHeader()).send({ title: 'B' })
      expect(res.status).toBe(200)
      const upd = db.callsFor('cv_build', 'update').concat(db.callsFor('cv_build', 'upsert'))
      expect(upd.some((c) => c.payload?.state === 'pending')).toBe(true)
    })

    it('DELETE /api/projects/2 → 200 and the row is gone', async () => {
      const res = await request(app).delete('/api/projects/2').set(authHeader())
      expect(res.status).toBe(200)
      expect(db.rows('projects').map((p) => p.id)).toEqual([1, 3])
    })
  })
})
