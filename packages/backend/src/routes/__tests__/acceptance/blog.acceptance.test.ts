/**
 * QA acceptance: blog. plan T5; H-3, H-4, H-14, H-15, H-9 point 4.
 */
import request from 'supertest'
import { mockServices, authHeader } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

const post = (over: Record<string, any>) => ({
  excerpt: 'e', content: 'c', author: 'Demi', read_time: 3, category: 'Dev', tags: '["a"]', featured: false,
  published: true, cover_image: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', ...over
})

describe('QA blog', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { blog_posts: [
      post({ id: 1, title: 'One', slug: 'one', featured: true, created_at: '2025-02-01T00:00:00Z' }),
      post({ id: 2, title: 'Two', slug: 'two', created_at: '2025-05-01T00:00:00Z' }),
      post({ id: 3, title: 'Draft', slug: 'draft', published: false, created_at: '2025-06-01T00:00:00Z' })
    ] } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('POST {title:"Draft"} → 201 published false', async () => {
    const res = await request(app).post('/api/blog').set(authHeader()).send({ title: 'New draft' })
    expect(res.status).toBe(201)
    expect(res.body.data.published).toBe(false)
    expect(db.callsFor('blog_posts', 'insert')[0].payload.published).toBe(false)
  })

  it('draft with tags [] and empty strings → 201', async () => {
    const res = await request(app).post('/api/blog').set(authHeader()).send({ title: 'D2', excerpt: '', content: '', category: '', tags: [] })
    expect(res.status).toBe(201)
  })

  it('POST {title, published:true} → 400 naming excerpt, content, category', async () => {
    const paths = expectInvalid(await request(app).post('/api/blog').set(authHeader()).send({ title: 'T', published: true }))
    expect(paths).toEqual(expect.arrayContaining(['excerpt', 'content', 'category']))
  })

  it('PUT published:true on a draft with empty fields (merged rule) → 400', async () => {
    db.rows('blog_posts').find((p) => p.id === 3)!.content = ''
    const paths = expectInvalid(await request(app).put('/api/blog/3').set(authHeader()).send({ published: true }))
    expect(paths).toContain('content')
  })

  it('PUT published:true on a complete draft → 200', async () => {
    const res = await request(app).put('/api/blog/3').set(authHeader()).send({ published: true })
    expect(res.status).toBe(200)
  })

  it('slug clash on POST → "-1" suffix', async () => {
    const res = await request(app).post('/api/blog').set(authHeader()).send({ title: 'x', slug: 'one' })
    expect(res.status).toBe(201)
    expect(res.body.data.slug).toBe('one-1')
  })

  it('invalid slug on PUT → 400', async () => {
    const res = await request(app).put('/api/blog/2').set(authHeader()).send({ slug: 'Bad Slug' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('?limit=500 → range(0,99); default limit 50 → range(0,49)', async () => {
    await request(app).get('/api/blog?limit=500')
    await request(app).get('/api/blog')
    const ranges = db.callsFor('blog_posts', 'select').map((c) => c.range).filter(Boolean)
    expect(ranges).toEqual([[0, 99], [0, 49]])
  })

  it('search strips ,()% characters before reaching the query', async () => {
    await request(app).get('/api/blog?search=' + encodeURIComponent('a,b(c)%d'))
    const sel = db.callsFor('blog_posts', 'select').find((c) => c.filters.some((f) => f.type === 'or'))!
    const expr = (sel.filters.find((f) => f.type === 'or') as any).expression as string
    // the user's text reaches each ilike term without , ( ) or %
    const terms = expr.split(',')
    expect(terms).toHaveLength(2)
    for (const t of terms) {
      const userText = t.replace(/^\w+\.ilike\.%/, '').replace(/%$/, '')
      expect(userText).not.toMatch(/[,()%]/)
      expect(userText.replace(/\s+/g, '')).toBe('abcd')
    }
  })

  it('public list: published only, no content, publish_date = created_at, newest first', async () => {
    const res = await request(app).get('/api/blog')
    expect(res.status).toBe(200)
    expect(res.body.data.map((p: any) => p.id)).toEqual([2, 1])
    for (const p of res.body.data) {
      expect(p).not.toHaveProperty('content')
      expect(p.publish_date).toBe(p.created_at)
      expect(Array.isArray(p.tags)).toBe(true)
    }
  })

  it('GET /api/blog/:slug → content + publish_date; draft or missing → 404', async () => {
    const res = await request(app).get('/api/blog/two')
    expect(res.status).toBe(200)
    expect(res.body.data.content).toBe('c')
    expect(res.body.data.publish_date).toBe('2025-05-01T00:00:00Z')
    expect((await request(app).get('/api/blog/draft')).status).toBe(404)
    expect((await request(app).get('/api/blog/nope')).status).toBe(404)
  })

  it('/admin/all no token → 401; admin → includes drafts', async () => {
    expect((await request(app).get('/api/blog/admin/all')).status).toBe(401)
    const res = await request(app).get('/api/blog/admin/all').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.map((p: any) => p.id)).toContain(3)
  })

  it('H-4: PUT featured:true on 2 → unfeatured [1], one featured', async () => {
    const res = await request(app).put('/api/blog/2').set(authHeader()).send({ featured: true })
    expect(res.status).toBe(200)
    expect(res.body.data.unfeatured).toEqual([1])
    expect(db.rows('blog_posts').filter((p) => p.featured).map((p) => p.id)).toEqual([2])
  })

  it('H-4: POST featured:true clears others; plain POST unfeatured []', async () => {
    const a = await request(app).post('/api/blog').set(authHeader()).send({ title: 'F', featured: true })
    expect(a.body.data.unfeatured).toEqual([1])
    const b = await request(app).post('/api/blog').set(authHeader()).send({ title: 'G' })
    expect(b.body.data.unfeatured).toEqual([])
  })

  it('H-14: publish_date on POST is written to created_at', async () => {
    await request(app).post('/api/blog').set(authHeader()).send({ title: 'Dated', publish_date: '2024-04-01T00:00:00.000Z' })
    const insert = db.callsFor('blog_posts', 'insert')[0].payload
    expect(String(insert.created_at)).toMatch(/^2024-04-01/)
  })
})
