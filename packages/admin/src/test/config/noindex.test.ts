import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')
const read = (f: string) => readFileSync(resolve(root, f), 'utf8')

describe('admin stays out of search and AI tools', () => {
  it('sends X-Robots-Tag on every response, before the other routes', () => {
    const routes = JSON.parse(read('vercel.json')).routes
    expect(routes[0]).toEqual({ src: '/(.*)', headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai' }, continue: true })
    expect(routes.at(-1)).toEqual({ src: '/(.*)', dest: '/index.html' })
    // robots.txt and the manifest are served as files, not the SPA fallback
    expect(routes.some((r: { src: string }) => r.src.includes('txt|webmanifest'))).toBe(true)
  })

  it('robots.txt allows only Googlebot and Bingbot', () => {
    const lines = read('public/robots.txt').split('\n').filter((l) => l && !l.startsWith('#'))
    expect(lines).toEqual(['User-agent: Googlebot', 'Allow: /', 'User-agent: Bingbot', 'Allow: /', 'User-agent: *', 'Disallow: /'])
  })

  it('index.html keeps the meta robots with noimageindex', () => {
    expect(read('index.html')).toContain('<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />')
  })

  it('the manifest has nothing that invites indexing', () => {
    const m = JSON.parse(read('public/site.webmanifest'))
    expect(Object.keys(m).sort()).toEqual(['background_color', 'display', 'icons', 'name', 'short_name', 'start_url', 'theme_color'])
    expect(m.display).toBe('browser')
  })
})
