/**
 * QA acceptance: About content (T12, H-16) and recommendations (T13, H-17).
 */
import request from 'supertest'
import * as cvBuild from '../../../services/cvBuild'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../../test/supabaseMock'
import { buildApp, expectInvalid, silenceConsole } from '../../../test/acceptanceApp'

const SEED = {
  intro: [
    "I'm Demi, a full-stack software engineer with five years of building real products: payroll platforms, learning platforms, desktop tools and, after hours, my own apps.",
    "I love the whole stack, but my heart is in the front end and the systems behind it: component libraries, design tokens and the small details that make an interface feel finished. These days I'm also deep into AI tooling, building MCP servers that help developers generate code that actually fits their design system."
  ],
  looking_for: {
    summary: "A remote role I can do from anywhere. I'm set up for remote work and open to working as a digital nomad.",
    items: [
      { label: 'Work style', value: 'Fully remote, digital nomad friendly' },
      { label: 'Roles', value: 'Full-stack or frontend-leaning engineer' },
      { label: 'Sweet spot', value: 'Design systems, component libraries, AI tooling' },
      { label: 'Based', value: 'UK, flexible across time zones' },
      { label: 'Also open to', value: 'Freelance projects' }
    ]
  },
  open_to_work_off_line: 'Happily at Cintra, always up for a chat',
  cv_headline: 'Full-stack Software Engineer',
  cv_profile: "Full-stack software engineer with five years' experience building enterprise platforms, desktop tools and creator products. I specialise in component libraries and design systems, care as much about how software looks as how it runs, and work with a pragmatic, AI-assisted workflow. Looking for a fully remote role, and open to working as a digital nomad.",
  cv_ai_workflow: 'AI-assisted, never AI-driven: I own the problem, the architecture and the final review, and use AI to move faster. Claude daily at work and at home; experience with Cursor; ChatGPT, moving to Codex at work. Built an MCP server so AI tools generate code that fits our design system.',
  contact: {
    email: 'demi.21@outlook.com',
    linkedin_url: 'https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40',
    github_url: 'https://github.com/DemiInfinity',
    portfolio_url: 'https://www.demitaylornimmo.com',
    location: 'UK · Remote'
  }
}
const valid = () => JSON.parse(JSON.stringify(SEED))

describe('QA About content (H-16)', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: { site_content: [], cv_build: [{ id: 1, state: 'idle' }] } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('GET with no row → 200, defaults equal the migration seed, updated_at null, Cache-Control max-age=60', async () => {
    const res = await request(app).get('/api/content/about')
    expect(res.status).toBe(200)
    expect(res.body.data.open_to_work_off_line).toBe('Happily at Cintra, always up for a chat')
    expect(res.body.data.updated_at).toBeNull()
    const { updated_at, ...rest } = res.body.data
    expect(rest).toEqual(SEED)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
  })

  it('GET with a row → stored values; missing keys filled from defaults', async () => {
    db.rows('site_content').push({ key: 'about', value: { cv_headline: 'Stored headline', intro: ['Only one'] }, updated_at: '2026-10-28T00:00:00Z' })
    const res = await request(app).get('/api/content/about')
    expect(res.body.data.cv_headline).toBe('Stored headline')
    expect(res.body.data.intro).toEqual(['Only one'])
    expect(res.body.data.open_to_work_off_line).toBe(SEED.open_to_work_off_line)
    expect(res.body.data.contact).toEqual(SEED.contact)
    expect(new Date(res.body.data.updated_at).toISOString()).toBe('2026-10-28T00:00:00.000Z')
  })

  it('GET before the migration (no table) → 200 defaults', async () => {
    mockServices({ errors: { site_content: { code: '42P01', message: 'relation "site_content" does not exist' } } })
    const res = await request(buildApp()).get('/api/content/about')
    expect(res.status).toBe(200)
    expect(res.body.data.cv_headline).toBe(SEED.cv_headline)
  })

  it('PUT valid → 200 echo + upsert on site_content key about; CV dirty marked once', async () => {
    const dirty = jest.spyOn(cvBuild, 'markCvDirty')
    const body = { ...valid(), cv_headline: 'New headline' }
    const res = await request(app).put('/api/content/about').set(authHeader()).send(body)
    expect(res.status).toBe(200)
    const { updated_at, ...echo } = res.body.data
    expect(echo).toEqual(body)
    expect(typeof updated_at).toBe('string')
    const up = db.callsFor('site_content', 'upsert')
    expect(up).toHaveLength(1)
    expect(up[0].payload.key).toBe('about')
    expect(up[0].payload.value).toEqual(body)
    expect(dirty).toHaveBeenCalledTimes(1)
    const read = await request(app).get('/api/content/about')
    expect(read.body.data.cv_headline).toBe('New headline')
  })

  it('PUT with updated_at included is accepted or ignored, not stored as a key', async () => {
    const res = await request(app).put('/api/content/about').set(authHeader()).send({ ...valid(), updated_at: '2020-01-01T00:00:00Z' })
    if (res.status === 200) expect(db.callsFor('site_content', 'upsert')[0].payload.value.updated_at).toBeUndefined()
    else expectInvalid(res)
  })

  it.each([
    ['intro', (b: any) => { b.intro = [] }],
    ['intro', (b: any) => { b.intro = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    ['intro[0]', (b: any) => { b.intro = [''] }],
    ['intro[0]', (b: any) => { b.intro = ['x'.repeat(2001)] }],
    ['looking_for.summary', (b: any) => { b.looking_for.summary = 'x'.repeat(601) }],
    ['looking_for.items', (b: any) => { b.looking_for.items = Array.from({ length: 9 }, () => ({ label: 'l', value: 'v' })) }],
    ['looking_for.items[2].label', (b: any) => { b.looking_for.items[2].label = '' }],
    ['looking_for.items[0].value', (b: any) => { b.looking_for.items[0].value = 'x'.repeat(121) }],
    ['open_to_work_off_line', (b: any) => { b.open_to_work_off_line = '' }],
    ['cv_headline', (b: any) => { b.cv_headline = 'x'.repeat(81) }],
    ['cv_profile', (b: any) => { b.cv_profile = '' }],
    ['cv_ai_workflow', (b: any) => { b.cv_ai_workflow = 'x'.repeat(1201) }],
    ['contact.email', (b: any) => { b.contact.email = 'x' }],
    ['contact.github_url', (b: any) => { b.contact.github_url = 'github.com/x' }],
    ['contact.location', (b: any) => { b.contact.location = 'x'.repeat(81) }],
    ['foo', (b: any) => { b.foo = 1 }],
    ['contact.phone', (b: any) => { b.contact.phone = '0123' }]
  ])('PUT invalid → 400 with a path starting %s, nothing saved', async (path, mutate) => {
    const body = valid()
    mutate(body)
    const paths = expectInvalid(await request(app).put('/api/content/about').set(authHeader()).send(body))
    expect(paths.some((p) => p.startsWith(path))).toBe(true)
    expect(db.callsFor('site_content', 'upsert')).toHaveLength(0)
  })

  it('PUT boundary values accepted: summary "", items [], cv_ai_workflow "", urls ""', async () => {
    const b = valid()
    b.looking_for.summary = ''
    b.looking_for.items = []
    b.cv_ai_workflow = ''
    b.contact.linkedin_url = ''
    b.contact.location = ''
    expect((await request(app).put('/api/content/about').set(authHeader()).send(b)).status).toBe(200)
  })

  it('PUT no token → 401, non-admin → 403', async () => {
    expect((await request(app).put('/api/content/about').send(valid())).status).toBe(401)
    expect((await request(app).put('/api/content/about').set(authHeader(VIEWER_TOKEN)).send(valid())).status).toBe(403)
  })
})

describe('QA recommendations (H-17)', () => {
  let db: ReturnType<typeof mockServices>
  let app: ReturnType<typeof buildApp>
  beforeEach(() => {
    silenceConsole()
    db = mockServices({ tables: {
      recommendations: [
        { id: 1, quote: 'C', name: 'c', sort_order: 1, date: '2025-01-01', show_on_cv: false, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 2, quote: 'B', name: 'b', sort_order: 0, date: '2024-01-01', show_on_cv: false, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 3, quote: 'A', name: 'a', sort_order: 0, date: '2025-06-01', show_on_cv: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 4, quote: 'D', name: 'd', sort_order: 0, date: null, show_on_cv: false }
      ],
      cv_build: [{ id: 1, state: 'idle' }]
    } })
    app = buildApp()
  })
  afterEach(() => jest.restoreAllMocks())

  it('GET → public array ordered sort_order asc, date desc (nulls last), id', async () => {
    const res = await request(app).get('/api/recommendations')
    expect(res.status).toBe(200)
    expect(res.body.data.map((r: any) => r.id)).toEqual([3, 2, 4, 1])
  })

  it('GET item has every H-17 field', async () => {
    const res = await request(app).get('/api/recommendations/3')
    expect(res.status).toBe(200)
    for (const k of ['id', 'quote', 'full_text', 'name', 'role', 'company', 'relationship', 'source', 'source_url', 'date', 'show_on_cv', 'sort_order', 'created_at', 'updated_at']) {
      expect(res.body.data).toHaveProperty(k)
    }
    expect((await request(app).get('/api/recommendations/999')).status).toBe(404)
  })

  it('POST {quote, name} → 201 with defaults show_on_cv false, sort_order 0, nulls', async () => {
    const dirty = jest.spyOn(cvBuild, 'markCvDirty')
    const res = await request(app).post('/api/recommendations').set(authHeader()).send({ quote: 'Q', name: 'N' })
    expect(res.status).toBe(201)
    expect(res.body.data).toEqual(expect.objectContaining({ quote: 'Q', name: 'N', show_on_cv: false, sort_order: 0, full_text: null, role: null, date: null }))
    expect(dirty).toHaveBeenCalledTimes(1)
  })

  it('POST without quote → 400 path quote; without name → path name', async () => {
    expect(expectInvalid(await request(app).post('/api/recommendations').set(authHeader()).send({ name: 'N' }))).toContain('quote')
    expect(expectInvalid(await request(app).post('/api/recommendations').set(authHeader()).send({ quote: 'Q' }))).toContain('name')
  })

  it('date "2025-01" stored 2025-01-01', async () => {
    await request(app).post('/api/recommendations').set(authHeader()).send({ quote: 'Q', name: 'N', date: '2025-01' })
    expect(db.callsFor('recommendations', 'insert')[0].payload.date).toBe('2025-01-01')
  })

  it.each([
    ['source_url', { source_url: 'notaurl' }],
    ['quote', { quote: 'x'.repeat(601) }],
    ['name', { name: 'x'.repeat(121) }],
    ['full_text', { full_text: 'x'.repeat(5001) }],
    ['role', { role: 'x'.repeat(161) }],
    ['relationship', { relationship: 'x'.repeat(201) }],
    ['source', { source: 'x'.repeat(81) }],
    ['date', { date: 'Jan 2025' }],
    ['sort_order', { sort_order: 1.5 }]
  ])('invalid %s → 400', async (path, patch) => {
    expect(expectInvalid(await request(app).post('/api/recommendations').set(authHeader()).send({ quote: 'Q', name: 'N', ...patch }))).toContain(path)
  })

  it('PUT partial → 200 changes only that field; missing id → 404', async () => {
    const res = await request(app).put('/api/recommendations/1').set(authHeader()).send({ show_on_cv: true })
    expect(res.status).toBe(200)
    expect(db.rows('recommendations').find((r) => r.id === 1)).toEqual(expect.objectContaining({ show_on_cv: true, quote: 'C', name: 'c' }))
    expect((await request(app).put('/api/recommendations/999').set(authHeader()).send({ quote: 'x' })).status).toBe(404)
  })

  it('DELETE admin → 200 and gone', async () => {
    const res = await request(app).delete('/api/recommendations/2').set(authHeader())
    expect(res.status).toBe(200)
    expect(db.rows('recommendations').some((r) => r.id === 2)).toBe(false)
  })

  it('writes without token → 401; viewer → 403', async () => {
    expect((await request(app).post('/api/recommendations').send({ quote: 'Q', name: 'N' })).status).toBe(401)
    expect((await request(app).put('/api/recommendations/1').send({ quote: 'Q' })).status).toBe(401)
    expect((await request(app).delete('/api/recommendations/1')).status).toBe(401)
    expect((await request(app).post('/api/recommendations').set(authHeader(VIEWER_TOKEN)).send({ quote: 'Q', name: 'N' })).status).toBe(403)
  })
})
