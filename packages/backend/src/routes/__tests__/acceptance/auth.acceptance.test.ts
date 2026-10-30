/**
 * QA acceptance: T1 auth hardening, H-8 points 3-4, admin-only writes.
 * Written from plan-backend.md T1 and handoffs H-8.
 */
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../../test/supabaseMock'
import { buildApp, withEnv, silenceConsole } from '../../../test/acceptanceApp'

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }))

type Route = [method: 'get' | 'post' | 'put' | 'delete', path: string]

// Every admin route named in the plan (T1 list plus each task's admin endpoints).
const ADMIN_ROUTES: Route[] = [
  ['post', '/api/projects'], ['put', '/api/projects/1'], ['delete', '/api/projects/1'],
  ['get', '/api/projects/admin/all'], ['get', '/api/projects/admin/1'],
  ['post', '/api/blog'], ['put', '/api/blog/1'], ['delete', '/api/blog/1'], ['get', '/api/blog/admin/all'],
  ['post', '/api/learning'], ['put', '/api/learning/1'], ['delete', '/api/learning/1'],
  ['post', '/api/skills'], ['put', '/api/skills/1'], ['delete', '/api/skills/1'],
  ['post', '/api/work-history'], ['put', '/api/work-history/1'], ['delete', '/api/work-history/1'],
  ['post', '/api/education'], ['put', '/api/education/1'], ['delete', '/api/education/1'],
  ['post', '/api/certifications'], ['put', '/api/certifications/1'], ['delete', '/api/certifications/1'],
  ['get', '/api/analytics/overview'], ['get', '/api/analytics/summary'], ['get', '/api/analytics/detailed'],
  ['get', '/api/feature-flags'], ['get', '/api/feature-flags/1'], ['post', '/api/feature-flags'],
  ['put', '/api/feature-flags/1'], ['delete', '/api/feature-flags/1'],
  ['post', '/api/upload/image'], ['post', '/api/upload/images'], ['post', '/api/upload/resume'],
  ['delete', '/api/upload/resume'], ['delete', '/api/upload/object'], ['get', '/api/upload'],
  ['get', '/api/contact'], ['put', '/api/contact/1'],
  ['put', '/api/content/about'],
  ['post', '/api/recommendations'], ['put', '/api/recommendations/1'], ['delete', '/api/recommendations/1'],
  ['get', '/api/cv/status'], ['post', '/api/cv/regenerate']
]

const seed = () => ({
  projects: [{ id: 1, title: 'P', slug: 'p', status: 'completed', show_on_site: true, technologies: [], images: [], created_at: '2025-01-01T00:00:00Z' }],
  blog_posts: [{ id: 1, title: 'B', slug: 'b', published: true, created_at: '2025-01-01T00:00:00Z' }],
  learning: [{ id: 1, title: 'L', category: 'c', start_date: '2025-01-01', progress: 0, status: 'in_progress' }],
  skills: [{ id: 1, name: 'S', category: 'c', level: 'expert' }],
  work_history: [{ id: 1, company: 'C', position: 'P', start_date: '2025-01-01' }],
  education: [{ id: 1, institution: 'I', degree: 'D', start_date: '2025-01-01' }],
  certifications: [{ id: 1, name: 'N', issuer: 'I', issue_date: '2025-01-01' }],
  feature_flags: [{ id: 1, name: 'custom_flag', enabled: false }],
  contact_messages: [{ id: 1, kind: 'hi', name: '', email: 'a@b.co', message: 'm', status: 'new' }],
  recommendations: [{ id: 1, quote: 'Q', name: 'N', show_on_cv: false, sort_order: 0 }],
  cv_build: [{ id: 1, state: 'idle' }]
})

describe('QA T1: admin-only routes', () => {
  let restore: () => void
  beforeEach(() => {
    restore = withEnv({ ADMIN_EMAILS: undefined, ALLOW_REGISTRATION: undefined })
    silenceConsole()
  })
  afterEach(() => {
    restore()
    jest.restoreAllMocks()
  })

  const writes = (db: ReturnType<typeof mockServices>) =>
    db.calls.filter((c) => c.op !== 'select' && c.table !== 'cv_build')

  it.each(ADMIN_ROUTES)('%s %s: no token → 401, bad token → 401, viewer → 403, nothing written', async (method, path) => {
    const db = mockServices({ tables: seed() })
    const app = buildApp()
    const none = await (request(app) as any)[method](path).send({})
    expect(none.status).toBe(401)
    expect(none.body.success).toBe(false)
    const bad = await (request(app) as any)[method](path).set(authHeader('not-a-real-token')).send({})
    expect(bad.status).toBe(401)
    const viewer = await (request(app) as any)[method](path).set(authHeader(VIEWER_TOKEN)).send({})
    expect(viewer.status).toBe(403)
    expect(viewer.body.success).toBe(false)
    expect(writes(db)).toEqual([])
  })

  it.each(ADMIN_ROUTES)('%s %s: ADMIN_EMAILS set without this admin\'s email → 403', async (method, path) => {
    restore = withEnv({ ADMIN_EMAILS: 'owner@x.com' })
    const db = mockServices({ tables: seed() })
    const res = await (request(buildApp()) as any)[method](path).set(authHeader()).send({})
    expect(res.status).toBe(403)
    expect(writes(db)).toEqual([])
  })

  it('ADMIN_EMAILS=a@x.com: b@x.com on POST /api/projects → 403; a@x.com → 201', async () => {
    restore = withEnv({ ADMIN_EMAILS: 'a@x.com' })
    mockServices({
      tables: seed(),
      users: {
        a: { id: 'a', email: 'a@x.com', user_metadata: {}, app_metadata: {} },
        b: { id: 'b', email: 'b@x.com', user_metadata: { role: 'admin' }, app_metadata: {} }
      }
    })
    const app = buildApp()
    expect((await request(app).post('/api/projects').set(authHeader('b')).send({ title: 'T' })).status).toBe(403)
    expect((await request(app).post('/api/projects').set(authHeader('a')).send({ title: 'T' })).status).toBe(201)
  })

  it('ADMIN_EMAILS listing is case-insensitive and comma separated', async () => {
    restore = withEnv({ ADMIN_EMAILS: ' other@x.com , ADMIN@example.com' })
    mockServices({ tables: seed() })
    const res = await request(buildApp()).get('/api/projects/admin/all').set(authHeader())
    expect(res.status).toBe(200)
  })

  it('ADMIN_EMAILS unset: an account with no role metadata is still admin (owner not locked out)', async () => {
    mockServices({ tables: seed(), users: { plain: { id: 'p', email: 'p@x.com', user_metadata: {}, app_metadata: {} } } })
    const res = await request(buildApp()).get('/api/projects/admin/all').set(authHeader('plain'))
    expect(res.status).toBe(200)
  })
})

describe('QA T1: register and change-password', () => {
  let restore: () => void
  let db: ReturnType<typeof mockServices>
  beforeEach(() => {
    restore = withEnv({ ADMIN_EMAILS: undefined, ALLOW_REGISTRATION: undefined })
    silenceConsole()
    db = mockServices({ passwords: { 'admin@example.com': 'right-password' } })
    ;(createClient as jest.Mock).mockReturnValue(db.client)
  })
  afterEach(() => {
    restore()
    jest.restoreAllMocks()
  })

  it('POST /api/auth/register → 403 Registration is disabled, signUp not called', async () => {
    const res = await request(buildApp()).post('/api/auth/register').send({ email: 'n@x.com', password: 'secret123', name: 'N' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ success: false, error: 'Registration is disabled' })
    expect(db.client.auth.signUp).not.toHaveBeenCalled()
  })

  it('PUT /api/auth/change-password wrong current → 400 Current password is incorrect, no update', async () => {
    const res = await request(buildApp()).put('/api/auth/change-password').set(authHeader())
      .send({ currentPassword: 'wrong-password', newPassword: 'new-secret' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ success: false, error: 'Current password is incorrect' })
    expect(db.client.auth.admin.updateUserById).not.toHaveBeenCalled()
  })

  it('PUT /api/auth/change-password no token → 401; bad token → 401', async () => {
    const app = buildApp()
    const body = { currentPassword: 'right-password', newPassword: 'new-secret' }
    expect((await request(app).put('/api/auth/change-password').send(body)).status).toBe(401)
    expect((await request(app).put('/api/auth/change-password').set(authHeader('nope')).send(body)).status).toBe(401)
  })

  it('PUT /api/auth/change-password right current → 200 and the password is updated', async () => {
    const res = await request(buildApp()).put('/api/auth/change-password').set(authHeader())
      .send({ currentPassword: 'right-password', newPassword: 'new-secret' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(db.client.auth.admin.updateUserById).toHaveBeenCalledWith('admin-user', { password: 'new-secret' })
  })

  it('auth 400s use Invalid input + details (H-8 point 5)', async () => {
    const res = await request(buildApp()).post('/api/auth/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    expect(res.body.details[0]).toEqual(expect.objectContaining({ path: expect.any(String), msg: expect.any(String) }))
  })

  it('GET /api/auth/me with ADMIN_EMAILS excluding the user reports role viewer', async () => {
    restore = withEnv({ ADMIN_EMAILS: 'owner@x.com' })
    const res = await request(buildApp()).get('/api/auth/me').set(authHeader())
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).toContain('"role":"viewer"')
  })

  it('login returns user {id,email,name,role} and session tokens', async () => {
    const res = await request(buildApp()).post('/api/auth/login').send({ email: 'admin@example.com', password: 'right-password' })
    expect(res.status).toBe(200)
    expect(res.body.data.user).toEqual({ id: 'admin-user', email: 'admin@example.com', name: 'Admin', role: 'admin' })
    expect(res.body.data.session).toEqual(expect.objectContaining({ access_token: 'good', refresh_token: expect.any(String) }))
  })
})
