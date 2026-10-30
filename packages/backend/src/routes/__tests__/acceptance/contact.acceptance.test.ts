/**
 * QA acceptance: Hire me form. plan T6; H-8 point 8, H-9 point 1, H-10, H-20.
 * Resend is mocked by spying on global fetch; no network.
 */
import request from 'supertest'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../../test/supabaseMock'
import { buildApp, withEnv, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

const valid = { kind: 'role', name: 'Ada', email: 'ada@example.com', message: 'Hello there', website: '', source_path: '/about' }

describe('QA contact', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  let fetchSpy: jest.SpyInstance
  let restore: () => void
  let warn: jest.SpyInstance

  beforeEach(() => {
    silenceConsole()
    warn = console.warn as unknown as jest.SpyInstance
    restore = withEnv({ RESEND_API_KEY: undefined, CONTACT_TO_EMAIL: undefined, CONTACT_FROM_EMAIL: undefined })
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue(new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any)
    db = mockServices({ tables: { contact_messages: [] } })
    app = buildApp()
  })
  afterEach(() => {
    restore()
    jest.restoreAllMocks()
  })

  const send = (body: any, ip = '198.51.100.23') => request(app).post('/api/contact').set('X-Forwarded-For', ip).send(body)

  it('valid → 201 {success, data:{id, received_at}}; insert has kind/name/email/message/source_path; IP anonymised', async () => {
    const res = await send(valid)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(Object.keys(res.body.data).sort()).toEqual(['id', 'received_at'])
    expect(new Date(res.body.data.received_at).toString()).not.toBe('Invalid Date')
    const p = db.callsFor('contact_messages', 'insert')[0].payload
    expect(p).toEqual(expect.objectContaining({ kind: 'role', name: 'Ada', email: 'ada@example.com', message: 'Hello there', source_path: '/about' }))
    expect(p.ip_address).toBeDefined()
    expect(p.ip_address).not.toBe('198.51.100.23')
    expect(p.ip_address).toMatch(/^198\.51\.100\.0$/)
  })

  it('blank name → 201, stored ""', async () => {
    const res = await send({ ...valid, name: '' })
    expect(res.status).toBe(201)
    expect(db.callsFor('contact_messages', 'insert')[0].payload.name).toBe('')
  })

  it('name omitted → 201', async () => {
    const { name, ...rest } = valid
    expect((await send(rest)).status).toBe(201)
  })

  it.each([
    ['email', { email: 'ada@' }],
    ['kind', { kind: 'spam' }],
    ['message', { message: '' }],
    ['message', { message: '   ' }],
    ['message', { message: 'x'.repeat(5001) }],
    ['name', { name: 'x'.repeat(121) }],
    ['email', { email: `${'a'.repeat(250)}@x.co` }]
  ])('invalid %s → 400 Invalid input with that path, nothing stored', async (path, patch) => {
    const paths = expectInvalid(await send({ ...valid, ...patch }))
    expect(paths).toContain(path)
    expect(db.callsFor('contact_messages', 'insert')).toHaveLength(0)
  })

  it('honeypot filled → 200 {success:true}, no insert, no fetch', async () => {
    restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com' })
    const res = await send({ ...valid, website: 'http://spam.example' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(db.callsFor('contact_messages', 'insert')).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('6th message from one IP in an hour → 429 with the contract message', async () => {
    for (let i = 0; i < 5; i++) expect((await send(valid, '192.0.2.5')).status).toBe(201)
    const res = await send(valid, '192.0.2.5')
    expect(res.status).toBe(429)
    expect(res.body).toEqual({ success: false, error: 'Too many messages. Please try again later.' })
    expect((await send(valid, '192.0.2.99')).status).toBe(201)
  })

  it('insert fails → 500 {success:false, error}', async () => {
    mockServices({ tables: {}, errors: { contact_messages: { message: 'boom' } } })
    const res = await request(buildApp()).post('/api/contact').send(valid)
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(typeof res.body.error).toBe('string')
  })

  describe('H-20 email', () => {
    it('env unset → no fetch, console.warn with the contract text, email_status skipped, still 201', async () => {
      const res = await send(valid)
      expect(res.status).toBe(201)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith('Contact email skipped: RESEND_API_KEY or CONTACT_TO_EMAIL not set')
      const upd = db.callsFor('contact_messages', 'update').map((c) => c.payload)
      expect(upd).toContainEqual(expect.objectContaining({ email_status: 'skipped' }))
      expect(db.rows('contact_messages')).toHaveLength(1)
    })

    it('only one of the two vars set → still skipped', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk' })
      expect((await send(valid)).status).toBe(201)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(db.rows('contact_messages')[0].email_status).toBe('skipped')
    })

    it('env set → one POST to Resend: to, reply_to, Bearer key, default from, subject, plain text only; status sent', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk_test', CONTACT_TO_EMAIL: 'owner@x.com' })
      const res = await send(valid)
      expect(res.status).toBe(201)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toBe('https://api.resend.com/emails')
      expect(init.method).toBe('POST')
      const headers = new Headers(init.headers)
      expect(headers.get('authorization')).toBe('Bearer rk_test')
      const body = JSON.parse(init.body)
      expect(body.to).toEqual(['owner@x.com'])
      expect(body.reply_to).toBe('ada@example.com')
      expect(body.from).toBe('Portfolio <onboarding@resend.dev>')
      expect(body.subject).toBe('Hire me: A full-time role from Ada')
      expect(body.html).toBeUndefined()
      expect(typeof body.text).toBe('string')
      expect(body.text).toContain('Hello there')
      expect(body.text).toContain('ada@example.com')
      expect(body.text).toContain('/about')
      expect(init.signal).toBeDefined()
      expect(db.rows('contact_messages')[0].email_status).toBe('sent')
    })

    it('CONTACT_FROM_EMAIL overrides the sender', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com', CONTACT_FROM_EMAIL: 'Demi <hi@demitaylornimmo.com>' })
      await send(valid)
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).from).toBe('Demi <hi@demitaylornimmo.com>')
    })

    it.each([
      ['freelance', 'Ada', 'Hire me: Freelance work from Ada'],
      ['hi', '', 'Hire me: Just saying hi from someone']
    ])('subject for kind %s name %p', async (kind, name, subject) => {
      restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com' })
      await send({ ...valid, kind, name })
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).subject).toBe(subject)
    })

    it('CR/LF in name stripped from the subject (header injection guard)', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com' })
      await send({ ...valid, name: 'Ada\r\nBcc: evil@x.com' })
      const subject = JSON.parse(fetchSpy.mock.calls[0][1].body).subject
      expect(subject).not.toMatch(/[\r\n]/)
    })

    it('fetch rejects → still 201, email_status failed with email_error', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com' })
      fetchSpy.mockRejectedValue(new Error('network down'))
      const res = await send(valid)
      expect(res.status).toBe(201)
      const row = db.rows('contact_messages')[0]
      expect(row.email_status).toBe('failed')
      expect(String(row.email_error)).toContain('network down')
    })

    it('Resend non-2xx → still 201, failed, email_error ≤500 chars', async () => {
      restore = withEnv({ RESEND_API_KEY: 'rk', CONTACT_TO_EMAIL: 'owner@x.com' })
      fetchSpy.mockResolvedValue(new Response('x'.repeat(2000), { status: 422 }) as any)
      expect((await send(valid)).status).toBe(201)
      const row = db.rows('contact_messages')[0]
      expect(row.email_status).toBe('failed')
      expect(String(row.email_error).length).toBeLessThanOrEqual(500)
    })

    it('pre-migration (no email_status column) → still 201', async () => {
      mockServices({ tables: { contact_messages: [] }, missingColumns: { contact_messages: ['email_status', 'email_error'] } })
      const res = await request(buildApp()).post('/api/contact').send(valid)
      expect(res.status).toBe(201)
    })
  })

  describe('admin read', () => {
    beforeEach(() => {
      db = mockServices({ tables: { contact_messages: [
        { id: 1, kind: 'hi', name: 'A', email: 'a@x.co', message: 'm1', source_path: '/', status: 'new', email_status: 'sent', ip_address: '1.2.3.0', user_agent: 'ua', created_at: '2026-10-01T00:00:00Z' },
        { id: 2, kind: 'role', name: 'B', email: 'b@x.co', message: 'm2', source_path: null, status: 'read', email_status: 'skipped', ip_address: '1.2.3.0', user_agent: 'ua', created_at: '2026-10-02T00:00:00Z' }
      ] } })
      app = buildApp()
    })

    it('GET /api/contact no token → 401, viewer → 403', async () => {
      expect((await request(app).get('/api/contact')).status).toBe(401)
      expect((await request(app).get('/api/contact').set(authHeader(VIEWER_TOKEN))).status).toBe(403)
    })

    it('GET /api/contact?status=new → items with the contract fields only (no IP/user agent)', async () => {
      const res = await request(app).get('/api/contact?status=new&limit=50').set(authHeader())
      expect(res.status).toBe(200)
      expect(res.body.data.map((m: any) => m.id)).toEqual([1])
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['created_at', 'email', 'email_status', 'id', 'kind', 'message', 'name', 'source_path', 'status'])
    })

    it('PUT /api/contact/:id {status:"read"} → 200; invalid status → 400', async () => {
      expect((await request(app).put('/api/contact/1').set(authHeader()).send({ status: 'read' })).status).toBe(200)
      expect(db.rows('contact_messages').find((m) => m.id === 1)!.status).toBe('read')
      expectInvalid(await request(app).put('/api/contact/1').set(authHeader()).send({ status: 'deleted' }))
    })
  })
})
