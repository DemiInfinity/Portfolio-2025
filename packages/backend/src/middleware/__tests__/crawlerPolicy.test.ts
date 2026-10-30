import request from 'supertest'
import express from 'express'
import { applyCrawlerPolicy, X_ROBOTS_TAG, ROBOTS_TXT } from '../crawlerPolicy'
import { mountApiRoutes } from '../../routes/mount'
import { notFound } from '../notFound'
import { errorHandler } from '../errorHandler'
import { mockServices } from '../../test/supabaseMock'

const EXPECTED = 'noindex, nofollow, noarchive, nosnippet, noai, noimageai'

function buildApp() {
  const app = express()
  applyCrawlerPolicy(app)
  app.use(express.json())
  app.get('/boom', () => {
    throw new Error('boom')
  })
  mountApiRoutes(app)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

describe('crawler policy (API not indexable)', () => {
  beforeEach(() => {
    mockServices({ tables: { projects: [] } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('the header value is exactly as specified', () => {
    expect(X_ROBOTS_TAG).toBe(EXPECTED)
  })

  it('a normal route carries X-Robots-Tag', async () => {
    const res = await request(buildApp()).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.headers['x-robots-tag']).toBe(EXPECTED)
  })

  it('an error response carries it', async () => {
    const res = await request(buildApp()).get('/boom')
    expect(res.status).toBe(500)
    expect(res.headers['x-robots-tag']).toBe(EXPECTED)
  })

  it('a 404 carries it', async () => {
    const res = await request(buildApp()).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.headers['x-robots-tag']).toBe(EXPECTED)
  })

  it('an auth failure and the CV aggregate carry it', async () => {
    const app = buildApp()
    expect((await request(app).get('/api/cv/status')).headers['x-robots-tag']).toBe(EXPECTED)
    expect((await request(app).get('/api/cv')).headers['x-robots-tag']).toBe(EXPECTED)
  })

  it('GET /robots.txt disallows everything, as text/plain', async () => {
    const res = await request(buildApp()).get('/robots.txt')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^text\/plain/)
    expect(res.text).toBe(ROBOTS_TXT)
    expect(res.text).toBe('User-agent: *\nDisallow: /\n')
    expect(res.headers['x-robots-tag']).toBe(EXPECTED)
  })

  it('the production entry point (vercel.ts) serves robots.txt before rate limiting and Supabase init, and tags errors', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const app = require('../../vercel').default
    for (let i = 0; i < 105; i++) {
      const res = await request(app).get('/robots.txt')
      expect(res.status).toBe(200)
    }
    const res = await request(app).get('/api/does-not-exist')
    expect(res.headers['x-robots-tag']).toBe(EXPECTED)
  })
})
