import request from 'supertest'
import express from 'express'
import router from '../projects'
import { mockServices, authHeader } from '../../test/supabaseMock'

const rows = () => [
  { id: 1, title: 'Visible', slug: 'visible', status: 'in_development', show_on_site: true, featured: true, technologies: [], created_at: '2025-01-01T00:00:00Z',
    case_study: { overview: 'O', features: [{ title: 'Profiles' }] }, content: 'old md' },
  { id: 2, title: 'Idea', slug: 'idea', status: 'ideas', show_on_site: true, featured: false, technologies: [], created_at: '2025-02-01T00:00:00Z' },
  { id: 3, title: 'Hidden', slug: 'hidden', status: 'completed', show_on_site: false, featured: false, technologies: [], created_at: '2025-03-01T00:00:00Z',
    case_study: { overview: 'H' } }
]

describe('Projects API (writes, spotlight, visibility, case study)', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({ tables: { projects: rows() } })
    app = express()
    app.use(express.json())
    app.use('/api/projects', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const put = (id: number, body: any) => request(app).put(`/api/projects/${id}`).set(authHeader()).send(body)

  describe('T4', () => {
    it('PUT featured:true on 2 clears 1 and reports unfeatured [1]', async () => {
      const res = await put(2, { featured: true })
      expect(res.status).toBe(200)
      expect(res.body.data.unfeatured).toEqual([1])
      const clear = db.callsFor('projects', 'update').find((c) => c.payload.featured === false)!
      expect(clear.filters).toEqual(expect.arrayContaining([{ type: 'neq', column: 'id', value: 2 }, { type: 'eq', column: 'featured', value: true }]))
      expect(db.rows('projects').filter((r) => r.featured).map((r) => r.id)).toEqual([2])
    })

    it('PUT featured:false touches only that record', async () => {
      const res = await put(1, { featured: false })
      expect(res.body.data.unfeatured).toEqual([])
      expect(db.callsFor('projects', 'update')).toHaveLength(1)
    })

    it('POST {title} only → 201, description "", unique slug, unfeatured []', async () => {
      const res = await request(app).post('/api/projects').set(authHeader()).send({ title: 'Visible' })
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({ description: '', slug: 'visible-1', unfeatured: [], show_on_site: true })
      expect(db.callsFor('projects', 'insert')[0].payload.show_on_site).toBe(true)
    })

    it('POST with a bad status → 400', async () => {
      const res = await request(app).post('/api/projects').set(authHeader()).send({ title: 'T', description: 'D', status: 'idea' })
      expect(res.status).toBe(400)
      expect(res.body.details[0].path).toBe('status')
    })

    it('PUT technologies [] → 200 and stored as an array; comma string accepted', async () => {
      expect((await put(1, { technologies: [] })).status).toBe(200)
      await put(1, { technologies: 'React, Node' })
      expect(db.callsFor('projects', 'update').pop()!.payload.technologies).toEqual(['React', 'Node'])
    })

    it('PUT bad slug → 400 Invalid slug (not 500); duplicate slug → 400', async () => {
      const bad = await put(1, { slug: 'Bad Slug' })
      expect(bad.status).toBe(400)
      expect(bad.body.error).toBe('Invalid slug')
      const dup = await put(1, { slug: 'idea' })
      expect(dup.status).toBe(400)
      expect(dup.body.details[0].path).toBe('slug')
    })

    it('role and platform: empty → null, over 120 → 400', async () => {
      await put(1, { role: '', platform: 'Desktop app and web' })
      expect(db.callsFor('projects', 'update').pop()!.payload).toMatchObject({ role: null, platform: 'Desktop app and web' })
      expect((await put(1, { role: 'x'.repeat(121) })).status).toBe(400)
    })

    it('PUT missing id → 404', async () => {
      expect((await put(99, { title: 'x' })).status).toBe(404)
    })
  })

  describe('T14 visibility and case study', () => {
    it('public list shows only shown, non-idea projects with has_case_study and feature_titles', async () => {
      const res = await request(app).get('/api/projects')
      expect(res.body.data.map((p: any) => p.id)).toEqual([1])
      expect(res.body.data[0]).toMatchObject({ has_case_study: true, feature_titles: ['Profiles'] })
      expect(res.body.data[0]).not.toHaveProperty('case_study')
      expect(res.body.data[0]).not.toHaveProperty('content')
    })

    it('hidden and idea projects 404 on public single reads', async () => {
      expect((await request(app).get('/api/projects/slug/hidden')).status).toBe(404)
      expect((await request(app).get('/api/projects/2')).status).toBe(404)
      const ok = await request(app).get('/api/projects/slug/visible')
      expect(ok.status).toBe(200)
      expect(ok.body.data.case_study.overview).toBe('O')
      expect(ok.body.data.content).toBe('old md')
    })

    it('admin list shows all 3; admin single shows hidden with case_study; both need a token', async () => {
      const all = await request(app).get('/api/projects/admin/all').set(authHeader())
      expect(all.body.data).toHaveLength(3)
      expect(all.body.data.find((p: any) => p.id === 3).show_on_site).toBe(false)
      const one = await request(app).get('/api/projects/admin/3').set(authHeader())
      expect(one.status).toBe(200)
      expect(one.body.data.case_study).toEqual({ overview: 'H' })
      expect((await request(app).get('/api/projects/admin/all')).status).toBe(401)
    })

    it('PUT case_study stores the normalised object; unknown key → 400; null clears', async () => {
      const res = await put(1, { case_study: { overview: ' O ', metrics: [{ value: '30%', label: 'lower costs' }] } })
      expect(res.status).toBe(200)
      expect(db.callsFor('projects', 'update').pop()!.payload.case_study).toEqual({ overview: 'O', metrics: [{ value: '30%', label: 'lower costs' }] })
      const bad = await put(1, { case_study: { foo: 1 } })
      expect(bad.status).toBe(400)
      expect(bad.body.details[0].path).toBe('case_study.foo')
      await put(1, { case_study: null })
      expect(db.callsFor('projects', 'update').pop()!.payload.case_study).toBeNull()
    })

    it('works before either migration: no role/platform/case_study/show_on_site columns', async () => {
      db = mockServices({
        tables: { projects: [{ id: 1, title: 'A', slug: 'a', status: 'completed', created_at: '2025-01-01T00:00:00Z' }] },
        missingColumns: { projects: ['role', 'platform', 'case_study', 'show_on_site'] }
      })
      const list = await request(app).get('/api/projects')
      expect(list.status).toBe(200)
      expect(list.body.data[0]).toMatchObject({ role: null, platform: null, has_case_study: false, feature_titles: [], show_on_site: true })
      const created = await request(app).post('/api/projects').set(authHeader()).send({ title: 'New', role: 'Solo' })
      expect(created.status).toBe(201)
    })
  })
})
