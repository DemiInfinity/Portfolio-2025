import request from 'supertest'
import express from 'express'
import router, { cleanSearch, pageParams } from '../blog'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Blog API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({
      tables: {
        blog_posts: [
          { id: 1, title: 'My post', slug: 'my-post', excerpt: 'E', content: 'C', category: 'Dev', tags: '["a"]', featured: true, published: true, created_at: '2026-04-01T00:00:00Z' },
          { id: 2, title: 'Draft', slug: 'draft', excerpt: '', content: '', category: '', tags: '[]', featured: false, published: false, created_at: '2026-05-01T00:00:00Z' }
        ]
      }
    })
    app = express()
    app.use(express.json())
    app.use('/api/blog', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const post = (body: any) => request(app).post('/api/blog').set(authHeader()).send(body)
  const put = (id: number, body: any) => request(app).put(`/api/blog/${id}`).set(authHeader()).send(body)

  it('POST {title:"Draft"} → 201 draft with empty text fields', async () => {
    const res = await post({ title: 'Draft' })
    expect(res.status).toBe(201)
    expect(res.body.data.published).toBe(false)
    expect(res.body.data.slug).toBe('draft-1')
    expect(db.callsFor('blog_posts', 'insert')[0].payload).toMatchObject({ excerpt: '', content: '', category: '', tags: [] })
  })

  it('POST {title, published:true} without the rest → 400 naming the missing fields', async () => {
    const res = await post({ title: 'T', published: true })
    expect(res.status).toBe(400)
    expect(res.body.details.map((d: any) => d.path).sort()).toEqual(['category', 'content', 'excerpt'])
  })

  it('POST with a taken slug → -1 suffix; invalid slug → 400', async () => {
    const res = await post({ title: 'T', slug: 'my-post', excerpt: 'e', content: 'c', category: 'x', tags: ['t'] })
    expect(res.status).toBe(201)
    expect(res.body.data.slug).toBe('my-post-1')
    expect((await post({ title: 'T', slug: 'Not OK' })).status).toBe(400)
  })

  it('POST tags as comma string; publish_date writes created_at', async () => {
    await post({ title: 'T', tags: 'a, b', publish_date: '2026-03-01T09:00:00.000Z' })
    expect(db.callsFor('blog_posts', 'insert')[0].payload).toMatchObject({ tags: ['a', 'b'], created_at: '2026-03-01T09:00:00.000Z' })
  })

  it('POST featured:true clears the other featured post', async () => {
    const res = await post({ title: 'New', featured: true })
    expect(res.body.data.unfeatured).toEqual([1])
  })

  it('PUT publishing a draft with empty content → 400; with content → 200', async () => {
    expect((await put(2, { published: true })).status).toBe(400)
    const ok = await put(2, { published: true, excerpt: 'e', content: 'c', category: 'Dev', tags: [] })
    expect(ok.status).toBe(200)
    expect(ok.body.data.published).toBe(true)
  })

  it('PUT slug: invalid → 400, duplicate → 400, same → ok', async () => {
    expect((await put(2, { slug: 'Bad Slug' })).status).toBe(400)
    expect((await put(2, { slug: 'my-post' })).status).toBe(400)
    expect((await put(1, { slug: 'my-post' })).status).toBe(200)
  })

  it('PUT missing → 404', async () => {
    expect((await put(9, { title: 'x' })).status).toBe(404)
  })

  it('GET ?limit=500 → range(0, 99); default range(0, 49)', async () => {
    await request(app).get('/api/blog?limit=500')
    expect(db.callsFor('blog_posts', 'select').pop()!.range).toEqual([0, 99])
    await request(app).get('/api/blog')
    expect(db.callsFor('blog_posts', 'select').pop()!.range).toEqual([0, 49])
  })

  it('GET returns published only with publish_date and parsed tags', async () => {
    const res = await request(app).get('/api/blog')
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ publish_date: '2026-04-01T00:00:00Z', tags: ['a'] })
  })

  it('search strips filter characters', async () => {
    expect(cleanSearch('a,b(c)%d')).toBe('a b c  d')
    await request(app).get('/api/blog?search=' + encodeURIComponent('x),id.eq.2'))
    const or = db.callsFor('blog_posts', 'select').pop()!.filters.find((f) => f.type === 'or') as any
    expect(or.expression).not.toMatch(/\)|,id/)
  })

  it('pageParams clamps', () => {
    expect(pageParams('0', '-3')).toEqual({ from: 0, to: 49 })
    expect(pageParams('10', '20')).toEqual({ from: 20, to: 29 })
  })

  it('GET /admin/all without a token → 401; with admin shows drafts', async () => {
    expect((await request(app).get('/api/blog/admin/all')).status).toBe(401)
    const res = await request(app).get('/api/blog/admin/all').set(authHeader())
    expect(res.body.data).toHaveLength(2)
  })
})
