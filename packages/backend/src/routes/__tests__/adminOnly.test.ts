import request from 'supertest'
import express from 'express'
import { mountApiRoutes } from '../mount'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }))

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** Every route that writes, or reads admin-only data. Add new admin routes here. */
const ADMIN_ROUTES: [Method, string][] = [
  ['post', '/api/projects'],
  ['put', '/api/projects/1'],
  ['delete', '/api/projects/1'],
  ['get', '/api/blog/admin/all'],
  ['post', '/api/blog'],
  ['put', '/api/blog/1'],
  ['delete', '/api/blog/1'],
  ['post', '/api/learning'],
  ['put', '/api/learning/1'],
  ['delete', '/api/learning/1'],
  ['post', '/api/skills'],
  ['put', '/api/skills/1'],
  ['delete', '/api/skills/1'],
  ['post', '/api/work-history'],
  ['put', '/api/work-history/1'],
  ['delete', '/api/work-history/1'],
  ['post', '/api/education'],
  ['put', '/api/education/1'],
  ['delete', '/api/education/1'],
  ['post', '/api/certifications'],
  ['put', '/api/certifications/1'],
  ['delete', '/api/certifications/1'],
  ['get', '/api/feature-flags'],
  ['get', '/api/feature-flags/1'],
  ['post', '/api/feature-flags'],
  ['put', '/api/feature-flags/1'],
  ['delete', '/api/feature-flags/1'],
  ['get', '/api/analytics/overview'],
  ['get', '/api/analytics/detailed'],
  ['post', '/api/upload/image'],
  ['post', '/api/upload/images'],
  ['post', '/api/upload/resume'],
  ['delete', '/api/upload/object'],
  ['get', '/api/upload'],
  ['delete', '/api/upload/resume'],
  ['get', '/api/projects/admin/all'],
  ['get', '/api/projects/admin/1'],
  ['get', '/api/analytics/summary'],
  ['get', '/api/contact'],
  ['put', '/api/contact/1'],
  ['patch', '/api/contact/1'],
  ['delete', '/api/contact/1'],
  ['get', '/api/contact/unread-count'],
  ['put', '/api/content/about'],
  ['post', '/api/recommendations'],
  ['put', '/api/recommendations/1'],
  ['delete', '/api/recommendations/1'],
  ['get', '/api/cv/status'],
  ['post', '/api/cv/regenerate']
]

describe('Admin-only routes', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>
  const savedAllow = process.env.ADMIN_EMAILS

  beforeEach(() => {
    delete process.env.ADMIN_EMAILS
    db = mockServices({ tables: { projects: [{ id: 1, title: 'A', slug: 'a' }] } })
    app = express()
    app.use(express.json())
    mountApiRoutes(app)
  })

  afterEach(() => {
    if (savedAllow === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = savedAllow
    jest.restoreAllMocks()
  })

  it.each(ADMIN_ROUTES)('%s %s → 401 without a token', async (method, path) => {
    const res = await request(app)[method](path).send({})
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it.each(ADMIN_ROUTES)('%s %s → 401 with an invalid token', async (method, path) => {
    const res = await request(app)[method](path).set(authHeader('not-a-real-token')).send({})
    expect(res.status).toBe(401)
  })

  it.each(ADMIN_ROUTES)('%s %s → 403 with a non-admin token', async (method, path) => {
    const res = await request(app)[method](path).set(authHeader(VIEWER_TOKEN)).send({})
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('no write reaches the database for rejected requests', async () => {
    for (const [method, path] of ADMIN_ROUTES) {
      await request(app)[method](path).set(authHeader(VIEWER_TOKEN)).send({ title: 'x' })
    }
    expect(db.calls.filter((c) => c.op !== 'select')).toEqual([])
  })

  describe('ADMIN_EMAILS allowlist', () => {
    const otherUser = {
      other: { id: 'other', email: 'b@x.com', user_metadata: { role: 'admin' }, app_metadata: {} },
      owner: { id: 'owner', email: 'a@x.com', user_metadata: {}, app_metadata: {} }
    }

    it('an account not on the list gets 403 even with role admin in its metadata', async () => {
      process.env.ADMIN_EMAILS = 'a@x.com'
      db = mockServices({ users: otherUser })
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader('other'))
        .send({ title: 'T', description: 'D' })
      expect(res.status).toBe(403)
      expect(db.callsFor('projects', 'insert')).toHaveLength(0)
    })

    it('the listed account passes auth and creates the project', async () => {
      process.env.ADMIN_EMAILS = 'a@x.com'
      db = mockServices({ users: otherUser })
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader('owner'))
        .send({ title: 'T', description: 'D' })
      expect(res.status).toBe(201)
      expect(db.callsFor('projects', 'insert')).toHaveLength(1)
    })
  })

  it('public reads stay public', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
  })
})
