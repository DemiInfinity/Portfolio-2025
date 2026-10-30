import request from 'supertest'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import authRouter from '../supabase-auth'
import { mockServices, authHeader, ADMIN_TOKEN } from '../../test/supabaseMock'

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }))

const ENV_KEYS = ['ALLOW_REGISTRATION', 'ADMIN_EMAILS'] as const
const saved: Record<string, string | undefined> = {}

describe('Auth API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
    db = mockServices({ passwords: { 'admin@example.com': 'correct-horse' } })
    ;(createClient as jest.Mock).mockReturnValue(db.client)
    app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    jest.restoreAllMocks()
  })

  describe('POST /api/auth/register', () => {
    const body = { email: 'new@x.com', password: 'secret123', name: 'New Person' }

    it('is closed by default: 403 and Supabase signUp is never called', async () => {
      const res = await request(app).post('/api/auth/register').send(body)
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ success: false, error: 'Registration is disabled' })
      expect(db.client.auth.signUp).not.toHaveBeenCalled()
    })

    it('stays closed for any value other than the exact string "true"', async () => {
      process.env.ALLOW_REGISTRATION = '1'
      const res = await request(app).post('/api/auth/register').send(body)
      expect(res.status).toBe(403)
      expect(db.client.auth.signUp).not.toHaveBeenCalled()
    })

    it('when ALLOW_REGISTRATION=true, signs up without putting a role in user metadata', async () => {
      process.env.ALLOW_REGISTRATION = 'true'
      const res = await request(app).post('/api/auth/register').send(body)
      expect(res.status).toBe(200)
      expect(db.client.auth.signUp).toHaveBeenCalledTimes(1)
      const arg = (db.client.auth.signUp as jest.Mock).mock.calls[0][0]
      expect(arg.options.data).toEqual({ name: 'New Person' })
      expect(arg.options.data.role).toBeUndefined()
    })
  })

  describe('PUT /api/auth/change-password', () => {
    it('wrong current password → 400 (not 401, so the admin is not logged out)', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader())
        .send({ currentPassword: 'wrong-pass', newPassword: 'newsecret1' })
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ success: false, error: 'Current password is incorrect' })
      expect(db.client.auth.admin.updateUserById).not.toHaveBeenCalled()
    })

    it('no token → 401', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .send({ currentPassword: 'correct-horse', newPassword: 'newsecret1' })
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('invalid token → 401', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader('nope'))
        .send({ currentPassword: 'correct-horse', newPassword: 'newsecret1' })
      expect(res.status).toBe(401)
    })

    it('right current password → 200 and the password is updated', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader())
        .send({ currentPassword: 'correct-horse', newPassword: 'newsecret1' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(db.client.auth.admin.updateUserById).toHaveBeenCalledWith('admin-user', { password: 'newsecret1' })
    })

    it('a too-short new password → 400 Invalid input with details', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader())
        .send({ currentPassword: 'correct-horse', newPassword: '123' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid input')
      expect(res.body.details[0].path).toBe('newPassword')
    })
  })

  describe('POST /api/auth/login', () => {
    it('the existing admin can still sign in and is reported as admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'correct-horse' })
      expect(res.status).toBe(200)
      expect(res.body.data.user).toMatchObject({ email: 'admin@example.com', role: 'admin' })
      expect(res.body.data.session.access_token).toBe(ADMIN_TOKEN)
    })

    it('with ADMIN_EMAILS set, a listed admin is still admin', async () => {
      process.env.ADMIN_EMAILS = 'Admin@Example.com'
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'correct-horse' })
      expect(res.body.data.user.role).toBe('admin')
    })

    it('with ADMIN_EMAILS set, an unlisted account is reported as viewer', async () => {
      process.env.ADMIN_EMAILS = 'someone-else@x.com'
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'correct-horse' })
      expect(res.body.data.user.role).toBe('viewer')
    })

    it('bad credentials → 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'not-it-123' })
      expect(res.status).toBe(401)
    })

    it('validation failures use the shared 400 shape', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nope', password: 'x' })
      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ success: false, error: 'Invalid input' })
      expect(res.body.details.map((d: any) => d.path).sort()).toEqual(['email', 'password'])
    })
  })

  describe('PUT /api/auth/profile', () => {
    it('writes only the name into user_metadata and keeps the role', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set(authHeader())
        .send({ name: 'Demi', role: 'viewer' })
      expect(res.status).toBe(200)
      const [, attrs] = (db.client.auth.admin.updateUserById as jest.Mock).mock.calls[0]
      expect(attrs).toEqual({ user_metadata: { role: 'admin', name: 'Demi' } })
      expect(res.body.data.user).toMatchObject({ name: 'Demi', role: 'admin' })
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns the user with the resolved role', async () => {
      const res = await request(app).get('/api/auth/me').set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data.user).toEqual({ id: 'admin-user', email: 'admin@example.com', name: 'Admin', role: 'admin' })
    })

    it('no token → 401', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })
  })
})
