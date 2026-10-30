import request from 'supertest'
import express from 'express'
import { createContactRouter } from '../contact'
import { buildEmail, oneLine } from '../../services/mailer'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

const valid = { kind: 'role', name: 'Ada Lovelace', email: 'ada@company.com', message: 'What are you building?', website: '', source_path: '/about' }
const ENV = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']

describe('Contact API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>
  let fetchMock: jest.SpyInstance
  let warn: jest.SpyInstance
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV) { saved[k] = process.env[k]; delete process.env[k] }
    db = mockServices({ tables: { contact_messages: [] } })
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"id":"x"}', { status: 200 }))
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    app = express()
    app.set('trust proxy', 1)
    app.use(express.json())
    app.use('/api/contact', createContactRouter())
  })
  afterEach(() => {
    for (const k of ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
    jest.restoreAllMocks()
  })

  const send = (body: any, ip = '203.0.113.45') => request(app).post('/api/contact').set('X-Forwarded-For', ip).send(body)
  const insert = () => db.callsFor('contact_messages', 'insert')[0]?.payload

  it('valid body → 201 with id and received_at; row stored with anonymised IP', async () => {
    const res = await send(valid)
    expect(res.status).toBe(201)
    expect(typeof res.body.data.id).toBe('number')
    expect(new Date(res.body.data.received_at).toISOString()).toBe(res.body.data.received_at)
    expect(insert()).toMatchObject({ kind: 'role', name: 'Ada Lovelace', email: 'ada@company.com', message: 'What are you building?', source_path: '/about', ip_address: '203.0.113.0' })
  })

  it.each([
    [{ email: 'ada@' }, 'email'],
    [{ kind: 'spam' }, 'kind'],
    [{ message: '   ' }, 'message'],
    [{ name: 'x'.repeat(121) }, 'name']
  ])('%p → 400 with path %s', async (patch, path) => {
    const res = await send({ ...valid, ...patch })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    expect(res.body.details.map((d: any) => d.path)).toContain(path)
    expect(insert()).toBeUndefined()
  })

  it('blank name → 201, stored as ""', async () => {
    const res = await send({ ...valid, name: '' })
    expect(res.status).toBe(201)
    expect(insert().name).toBe('')
  })

  it('honeypot filled → 200 success, nothing stored or sent', async () => {
    process.env.RESEND_API_KEY = 'k'; process.env.CONTACT_TO_EMAIL = 'owner@x.com'
    const res = await send({ ...valid, website: 'http://x' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(insert()).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('6th request from one IP within the hour → 429', async () => {
    for (let i = 0; i < 5; i++) expect((await send(valid, '198.51.100.7')).status).toBe(201)
    const res = await send(valid, '198.51.100.7')
    expect(res.status).toBe(429)
    expect(res.body).toEqual({ success: false, error: 'Too many messages. Please try again later.' })
    expect((await send(valid, '198.51.100.8')).status).toBe(201)
  })

  it('env unset → no fetch, warning logged, email_status skipped', async () => {
    const res = await send(valid)
    expect(res.status).toBe(201)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('Contact email skipped: RESEND_API_KEY or CONTACT_TO_EMAIL not set')
    expect(db.callsFor('contact_messages', 'update')[0].payload).toEqual({ email_status: 'skipped' })
  })

  it('env set → one fetch to Resend with to, reply_to, bearer key and a plain-text body', async () => {
    process.env.RESEND_API_KEY = 're_test'; process.env.CONTACT_TO_EMAIL = 'owner@x.com'
    const res = await send(valid)
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test')
    const payload = JSON.parse(init.body)
    expect(payload).toMatchObject({ to: ['owner@x.com'], reply_to: 'ada@company.com', subject: 'Hire me: A full-time role from Ada Lovelace', from: 'Portfolio <onboarding@resend.dev>' })
    expect(payload).not.toHaveProperty('html')
    expect(payload.text).toContain('What are you building?')
    expect(db.callsFor('contact_messages', 'update')[0].payload).toEqual({ email_status: 'sent' })
  })

  it('fetch rejects → still 201, email_status failed with the error', async () => {
    process.env.RESEND_API_KEY = 'k'; process.env.CONTACT_TO_EMAIL = 'owner@x.com'
    fetchMock.mockRejectedValue(new Error('network down'))
    const res = await send(valid)
    expect(res.status).toBe(201)
    expect(db.callsFor('contact_messages', 'update')[0].payload).toEqual({ email_status: 'failed', email_error: 'network down' })
  })

  it('Resend non-2xx → failed; pre-migration status update failure still 201', async () => {
    process.env.RESEND_API_KEY = 'k'; process.env.CONTACT_TO_EMAIL = 'owner@x.com'
    fetchMock.mockResolvedValue(new Response('bad', { status: 422 }))
    db = mockServices({ tables: { contact_messages: [] }, missingColumns: { contact_messages: ['email_status', 'email_error'] } })
    const res = await send(valid)
    expect(res.status).toBe(201)
  })

  it('insert failure → 500', async () => {
    db = mockServices({ errors: { contact_messages: { message: 'boom' } } })
    const res = await send(valid)
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })

  it('subject and headers strip CR/LF', () => {
    const e = buildEmail({ kind: 'hi', name: 'Eve\r\nBcc: x@y.com', email: 'e@x.com\n', message: 'm', received_at: 't' }, { CONTACT_TO_EMAIL: 'o@x.com' } as any)
    expect(e.subject).toBe('Hire me: Just saying hi from Eve Bcc: x@y.com')
    expect(e.reply_to).toBe('e@x.com')
    expect(oneLine('a\nb')).toBe('a b')
  })

  it('GET /api/contact: 401 without token, 403 viewer, admin gets newest first with status filter', async () => {
    expect((await request(app).get('/api/contact')).status).toBe(401)
    expect((await request(app).get('/api/contact').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
    db = mockServices({ tables: { contact_messages: [
      { id: 1, kind: 'hi', email: 'a@x.com', message: 'a', status: 'read', email_status: 'sent', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, kind: 'hi', email: 'b@x.com', message: 'b', status: 'new', email_status: 'skipped', created_at: '2026-02-01T00:00:00Z' }
    ] } })
    const all = await request(app).get('/api/contact').set(authHeader())
    expect(all.body.data.map((m: any) => m.id)).toEqual([2, 1])
    const fresh = await request(app).get('/api/contact?status=new').set(authHeader())
    expect(fresh.body.data.map((m: any) => m.id)).toEqual([2])
    const put = await request(app).put('/api/contact/2').set(authHeader()).send({ status: 'archived' })
    expect(put.status).toBe(200)
    expect((await request(app).put('/api/contact/2').set(authHeader()).send({ status: 'gone' })).status).toBe(400)
  })
})
