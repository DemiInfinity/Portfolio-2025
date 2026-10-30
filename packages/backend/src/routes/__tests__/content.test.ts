import request from 'supertest'
import express from 'express'
import router from '../content'
import * as cvDirty from '../../services/cvDirty'
import { ABOUT_DEFAULTS } from '../../services/siteContent'
import { mockServices, authHeader, VIEWER_TOKEN } from '../../test/supabaseMock'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

describe('About content API', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>
  let dirty: jest.SpyInstance

  beforeEach(() => {
    db = mockServices({ tables: { site_content: [] } })
    dirty = jest.spyOn(cvDirty, 'markCvDirty').mockResolvedValue(undefined)
    app = express()
    app.use(express.json())
    app.use('/api/content', router)
  })
  afterEach(() => jest.restoreAllMocks())

  const put = (body: any, token = 'good') => request(app).put('/api/content/about').set(authHeader(token)).send(body)

  it('GET with no row → defaults and updated_at null', async () => {
    const res = await request(app).get('/api/content/about')
    expect(res.status).toBe(200)
    expect(res.body.data.open_to_work_off_line).toBe('Happily at Cintra, always up for a chat')
    expect(res.body.data.updated_at).toBeNull()
    expect(res.headers['cache-control']).toBe('public, max-age=60')
  })

  it('GET with a row → stored values over defaults', async () => {
    db = mockServices({ tables: { site_content: [{ key: 'about', value: { cv_headline: 'Engineer' }, updated_at: '2026-10-01T00:00:00Z' }] } })
    const res = await request(app).get('/api/content/about')
    expect(res.body.data.cv_headline).toBe('Engineer')
    expect(res.body.data.intro).toEqual(ABOUT_DEFAULTS.intro)
    expect(res.body.data.updated_at).toBe('2026-10-01T00:00:00Z')
  })

  it('PUT valid → 200 echo, upsert key about, CV marked dirty once', async () => {
    const body = { ...clone(ABOUT_DEFAULTS), cv_headline: 'New headline', updated_at: 'ignored' }
    const res = await put(body)
    expect(res.status).toBe(200)
    expect(res.body.data.cv_headline).toBe('New headline')
    expect(typeof res.body.data.updated_at).toBe('string')
    const up = db.callsFor('site_content', 'upsert')[0]
    expect(up.payload.key).toBe('about')
    expect(up.payload.value.cv_headline).toBe('New headline')
    expect(dirty).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{ intro: [] }, 'intro'],
    [{ contact: { ...ABOUT_DEFAULTS.contact, email: 'x' } }, 'contact.email'],
    [{ foo: 1 }, 'foo'],
    [{ contact: { ...ABOUT_DEFAULTS.contact, github_url: 'ftp://x' } }, 'contact.github_url'],
    [{ cv_headline: '' }, 'cv_headline'],
    [{ looking_for: { summary: '', items: [{ label: '', value: 'v' }] } }, 'looking_for.items[0].label']
  ])('PUT %p → 400 with path %s', async (patch, path) => {
    const res = await put({ ...clone(ABOUT_DEFAULTS), ...patch })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    expect(res.body.details.map((d: any) => d.path)).toContain(path)
    expect(dirty).not.toHaveBeenCalled()
  })

  it('PUT auth: 401 no token, 403 viewer', async () => {
    expect((await request(app).put('/api/content/about').send(ABOUT_DEFAULTS)).status).toBe(401)
    expect((await put(ABOUT_DEFAULTS, VIEWER_TOKEN)).status).toBe(403)
  })
})
