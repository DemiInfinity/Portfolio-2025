import request from 'supertest'
import express from 'express'
import { createContactRouter } from '../contact'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

const msg = (id: number, status: string, created_at: string, extra: any = {}) => ({
  id, kind: 'hi', name: `N${id}`, email: `n${id}@x.co`, message: `m${id}`, source_path: '/', status, email_status: 'sent', created_at, ...extra
})

describe('Messages inbox (H-24)', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({ tables: { contact_messages: [
      msg(1, 'read', '2026-10-01T09:00:00.000Z'),
      msg(2, 'new', '2026-10-03T09:00:00.000Z', { email_status: 'skipped' }),
      msg(3, 'new', '2026-10-02T09:00:00.000Z', { source_path: null }),
      msg(4, 'archived', '2026-09-01T09:00:00.000Z')
    ] } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    app = express()
    app.use(express.json())
    app.use('/api/contact', createContactRouter())
  })
  afterEach(() => jest.restoreAllMocks())

  const admin = (r: request.Test) => r.set(authHeader())

  it('GET: newest first, contract fields with read boolean, plus unread count', async () => {
    const res = await admin(request(app).get('/api/contact'))
    expect(res.status).toBe(200)
    expect(res.body.unread).toBe(2)
    expect(res.body.data.map((m: any) => m.id)).toEqual([2, 3, 1, 4])
    expect(res.body.data[0]).toEqual({
      id: 2, name: 'N2', email: 'n2@x.co', kind: 'hi', message: 'm2', source_path: '/', created_at: '2026-10-03T09:00:00.000Z',
      read: false, status: 'new', email_status: 'skipped'
    })
    expect(res.body.data.map((m: any) => m.read)).toEqual([false, false, true, true])
    expect(db.callsFor('contact_messages', 'select')[0].limit).toBe(100)
  })

  it('GET ?limit: default 100, max 500, bad values 400', async () => {
    await admin(request(app).get('/api/contact?limit=500'))
    expect(db.callsFor('contact_messages', 'select')[0].limit).toBe(500)
    expect((await admin(request(app).get('/api/contact?limit=501'))).status).toBe(400)
    expect((await admin(request(app).get('/api/contact?limit=0'))).status).toBe(400)
    const two = await admin(request(app).get('/api/contact?limit=2'))
    expect(two.body.data).toHaveLength(2)
  })

  it('GET /unread-count → {success, unread}, a head count query', async () => {
    const res = await admin(request(app).get('/api/contact/unread-count'))
    expect(res.body).toEqual({ success: true, unread: 2 })
  })

  it('PATCH {read:true} / {read:false} → updated row; archived stays archived', async () => {
    const r1 = await admin(request(app).patch('/api/contact/2')).send({ read: true })
    expect(r1.status).toBe(200)
    expect(r1.body.data).toMatchObject({ id: 2, read: true, status: 'read' })
    expect((await admin(request(app).get('/api/contact/unread-count'))).body.unread).toBe(1)

    const r2 = await admin(request(app).patch('/api/contact/1')).send({ read: false })
    expect(r2.body.data).toMatchObject({ id: 1, read: false, status: 'new' })

    const r3 = await admin(request(app).patch('/api/contact/4')).send({ read: true })
    expect(r3.body.data).toMatchObject({ read: true, status: 'archived' })
  })

  it('PATCH validation and 404', async () => {
    const bad = await admin(request(app).patch('/api/contact/2')).send({ read: 'yes' })
    expect(bad.status).toBe(400)
    expect(bad.body).toMatchObject({ success: false, error: 'Invalid input', details: [{ path: 'read', msg: expect.any(String) }] })
    const missing = await admin(request(app).patch('/api/contact/99')).send({ read: true })
    expect(missing.status).toBe(404)
    expect(missing.body).toEqual({ success: false, error: 'Not found' })
  })

  it('DELETE → 204 and the row is gone; missing → 404', async () => {
    const res = await admin(request(app).delete('/api/contact/3'))
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(db.rows('contact_messages').map((m) => m.id)).toEqual([1, 2, 4])
    expect((await admin(request(app).delete('/api/contact/3'))).status).toBe(404)
    expect((await admin(request(app).delete('/api/contact/abc'))).status).toBe(404)
  })

  it.each([
    ['get', '/api/contact'], ['get', '/api/contact/unread-count'], ['patch', '/api/contact/1'], ['delete', '/api/contact/1']
  ] as const)('%s %s: 401 without token, 403 for viewer', async (method, path) => {
    expect((await (request(app) as any)[method](path).send({ read: true })).status).toBe(401)
    expect((await (request(app) as any)[method](path).set(authHeader(VIEWER_TOKEN)).send({ read: true })).status).toBe(403)
    expect(db.rows('contact_messages')).toHaveLength(4)
  })

  it('works before the v2 migration (no email_status column): email_status reads pending', async () => {
    db = mockServices({ tables: { contact_messages: [msg(1, 'new', '2026-10-01T00:00:00Z')] }, missingColumns: { contact_messages: ['email_status'] } })
    const res = await admin(request(app).get('/api/contact'))
    expect(res.status).toBe(200)
    expect(res.body.data[0].email_status).toBe('pending')
  })
})
