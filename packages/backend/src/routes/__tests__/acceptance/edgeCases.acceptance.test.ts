/**
 * QA acceptance: edge cases around the contracts (H-4 ordering, ids, honeypot
 * types, H-18 image URLs, 404 shape, mount in both entry points).
 */
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { mockServices, authHeader } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'
import { API_ROUTES } from '../../mount'

const proj = (id: number, over: Record<string, any> = {}) => ({
  id, title: `P${id}`, slug: `p${id}`, description: '', technologies: [], images: [], status: 'completed',
  show_on_site: true, featured: false, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', ...over
})

describe('QA edge cases', () => {
  beforeEach(() => silenceConsole())
  afterEach(() => jest.restoreAllMocks())

  describe('H-4 single featured: a rejected save never clears the spotlight', () => {
    it('PUT {featured:true, slug:"Bad Slug"} → 400 and the current spotlight stays', async () => {
      const db = mockServices({ tables: { projects: [proj(1, { featured: true }), proj(2)], cv_build: [{ id: 1, state: 'idle' }] } })
      const res = await request(buildApp()).put('/api/projects/2').set(authHeader()).send({ featured: true, slug: 'Bad Slug' })
      expect(res.status).toBe(400)
      expect(db.rows('projects').find((p) => p.id === 1)!.featured).toBe(true)
    })

    it('POST featured:true whose insert fails → 500 and the current spotlight stays', async () => {
      const db = mockServices({
        tables: { projects: [proj(1, { featured: true })], cv_build: [{ id: 1, state: 'idle' }] },
        errors: { projects: (c) => (c.op === 'insert' ? { message: 'insert failed', code: 'XX000' } : null) }
      })
      const res = await request(buildApp()).post('/api/projects').set(authHeader()).send({ title: 'New', featured: true })
      expect(res.status).toBe(500)
      expect(db.rows('projects').find((p) => p.id === 1)!.featured).toBe(true)
    })

    it('PUT featured:true on a missing id → 404 and the current spotlight stays', async () => {
      const db = mockServices({ tables: { projects: [proj(1, { featured: true })], cv_build: [{ id: 1, state: 'idle' }] } })
      const res = await request(buildApp()).put('/api/projects/999').set(authHeader()).send({ featured: true })
      expect(res.status).toBe(404)
      expect(db.rows('projects').find((p) => p.id === 1)!.featured).toBe(true)
    })

    it('blog: PUT featured:true on a missing id → 404 and the featured post stays', async () => {
      const db = mockServices({ tables: { blog_posts: [{ id: 1, title: 'B', slug: 'b', featured: true, published: true, excerpt: 'e', content: 'c', category: 'x' }] } })
      const res = await request(buildApp()).put('/api/blog/999').set(authHeader()).send({ featured: true })
      expect(res.status).toBe(404)
      expect(db.rows('blog_posts')[0].featured).toBe(true)
    })
  })

  describe('non-numeric ids are a 404/400, never a 500', () => {
    it.each([
      ['/api/projects/abc'], ['/api/recommendations/abc'], ['/api/learning/abc'], ['/api/work-history/abc'],
      ['/api/education/abc'], ['/api/certifications/abc']
    ])('GET %s', async (p) => {
      mockServices({ tables: {} })
      const res = await request(buildApp()).get(p)
      expect([400, 404]).toContain(res.status)
    })

    it('GET /api/projects/admin/abc (admin) → 400/404', async () => {
      mockServices({ tables: {} })
      expect([400, 404]).toContain((await request(buildApp()).get('/api/projects/admin/abc').set(authHeader())).status)
    })
  })

  describe('contact honeypot', () => {
    it.each([[true], [1], [['x']]])('a non-string honeypot value %p is treated as filled: nothing stored', async (website) => {
      const db = mockServices({ tables: { contact_messages: [] } })
      const res = await request(buildApp()).post('/api/contact')
        .send({ kind: 'hi', email: 'a@b.co', message: 'm', website })
      expect(res.status).toBe(200)
      expect(db.callsFor('contact_messages', 'insert')).toHaveLength(0)
    })

    it('message and name are stored trimmed', async () => {
      const db = mockServices({ tables: { contact_messages: [] } })
      await request(buildApp()).post('/api/contact').send({ kind: 'hi', name: '  Ada ', email: ' a@b.co ', message: '  hi  ', website: '' })
      const p = db.callsFor('contact_messages', 'insert')[0].payload
      expect(p).toEqual(expect.objectContaining({ name: 'Ada', email: 'a@b.co', message: 'hi' }))
    })

    it('missing kind → 400 path kind', async () => {
      mockServices({ tables: { contact_messages: [] } })
      const paths = expectInvalid(await request(buildApp()).post('/api/contact').send({ email: 'a@b.co', message: 'm', website: '' }))
      expect(paths).toContain('kind')
    })

    it('source_path over 300 → 400 path source_path', async () => {
      mockServices({ tables: { contact_messages: [] } })
      const paths = expectInvalid(await request(buildApp()).post('/api/contact').send({ kind: 'hi', email: 'a@b.co', message: 'm', website: '', source_path: '/' + 'x'.repeat(300) }))
      expect(paths).toContain('source_path')
    })
  })

  describe('H-18 case study images', () => {
    it('process image that is not an http(s) URL → 400', async () => {
      mockServices({ tables: { projects: [proj(1)], cv_build: [{ id: 1, state: 'idle' }] } })
      const res = await request(buildApp()).put('/api/projects/1').set(authHeader())
        .send({ case_study: { process: [{ title: 'T', image: 'javascript:alert(1)' }] } })
      const paths = expectInvalid(res)
      expect(paths).toContain('case_study.process[0].image')
    })

    it('features over the cap of 8 → 400 at case_study.features', async () => {
      mockServices({ tables: { projects: [proj(1)], cv_build: [{ id: 1, state: 'idle' }] } })
      const features = Array.from({ length: 9 }, (_, i) => ({ title: `F${i}` }))
      const paths = expectInvalid(await request(buildApp()).put('/api/projects/1').set(authHeader()).send({ case_study: { features } }))
      expect(paths.some((p) => p.startsWith('case_study.features'))).toBe(true)
    })

    it('case_study as a string → 400', async () => {
      mockServices({ tables: { projects: [proj(1)], cv_build: [{ id: 1, state: 'idle' }] } })
      expectInvalid(await request(buildApp()).put('/api/projects/1').set(authHeader()).send({ case_study: 'overview text' }))
    })

    it('show_on_site non-boolean → 400', async () => {
      mockServices({ tables: { projects: [proj(1)], cv_build: [{ id: 1, state: 'idle' }] } })
      expect(expectInvalid(await request(buildApp()).put('/api/projects/1').set(authHeader()).send({ show_on_site: 'yes' }))).toContain('show_on_site')
    })
  })

  describe('routing', () => {
    it('unknown /api route → 404', async () => {
      mockServices({ tables: {} })
      const res = await request(buildApp()).get('/api/does-not-exist')
      expect(res.status).toBe(404)
    })

    it('every new router is in the shared mount list used by both entry points', () => {
      const mounted = API_ROUTES.map(([p]) => p)
      expect(mounted).toEqual(expect.arrayContaining(['/contact', '/cv', '/content', '/recommendations', '/projects', '/analytics', '/feature-flags', '/upload']))
      for (const entry of ['index.ts', 'vercel.ts']) {
        const src = fs.readFileSync(path.join(__dirname, '../../..', entry), 'utf8')
        expect(src).toMatch(/mountApiRoutes\(app\)/)
      }
    })
  })

  describe('H-12: writes refresh updated_at so GET /api/cv updated_at moves (no DB trigger in the migrations)', () => {
    it.each([
      ['/api/projects/1', 'projects', { title: 'X' }],
      ['/api/recommendations/1', 'recommendations', { quote: 'New' }],
      ['/api/work-history/1', 'work_history', { company: 'C', position: 'P', start_date: '2024-01' }],
      ['/api/learning/1', 'learning', { progress: 50 }],
      ['/api/skills/1', 'skills', { name: 'Go' }],
      ['/api/education/1', 'education', { institution: 'U', degree: 'D', start_date: '2015-09' }],
      ['/api/certifications/1', 'certifications', { name: 'N', issuer: 'I', issue_date: '2024-01' }]
    ])('PUT %s sets updated_at', async (url, table, body) => {
      const old = '2020-01-01T00:00:00Z'
      const row = { id: 1, title: 'T', slug: 't', status: 'completed', show_on_site: true, quote: 'Q', name: 'N', company: 'C', position: 'P',
        start_date: '2024-01-01', category: 'c', level: 'expert', progress: 0, institution: 'U', degree: 'D', issuer: 'I', issue_date: '2024-01-01',
        created_at: old, updated_at: old }
      const db = mockServices({ tables: { [table]: [row], cv_build: [{ id: 1, state: 'idle' }] } })
      const res = await request(buildApp()).put(url).set(authHeader()).send(body)
      expect(res.status).toBe(200)
      expect(db.rows(table)[0].updated_at).not.toBe(old)
    })
  })
})
