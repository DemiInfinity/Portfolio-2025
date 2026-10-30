#!/usr/bin/env node
/**
 * Fixture mock of the backend API for the frontend e2e specs (plan-frontend.md "Tests").
 *
 * The site's pages fetch on the server, so cy.intercept can't reach them. Build and
 * start the frontend with NEXT_PUBLIC_API_URL=http://localhost:4010 and run this
 * server; it answers with the backend's `{ success, data }` shapes (H-9 to H-22).
 *
 *   node cypress/support/frontend/mock-api.mjs        (port 4010, or MOCK_API_PORT)
 *
 * Control endpoints used by the step definitions:
 *   POST /__mock/reset              reload cypress/fixtures/frontend/dataset.json, clear overrides and the log
 *   POST /__mock/state {data, routes}
 *        data:   top-level dataset keys to replace (projects, blog, work_history, ...)
 *        routes: { "GET /api/learning": { status: 500, body: {...}, delay?: ms } } exact-path overrides
 *   GET  /__mock/requests           every request seen since the last reset
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const DATASET = path.resolve(here, '../../fixtures/frontend/dataset.json')
const PORT = Number(process.env.MOCK_API_PORT || 4010)

let data = {}
let routes = {}
let log = []

function reset() {
  data = JSON.parse(fs.readFileSync(DATASET, 'utf8'))
  routes = {}
  log = []
}
reset()

/** Keys starting with "_" are fixture notes (e.g. `_pre` = row from before the v2 migration). */
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('_')))
}

/** H-19 public rule, applied by the server. */
function isPublic(p) {
  return p.show_on_site !== false && p.status !== 'ideas'
}

/** H-18 / H-22 list row: no case_study or content; adds has_case_study and feature_titles (v2 rows only). */
function listRow(p) {
  const { case_study, content, ...rest } = clean(p)
  if (p._pre) return rest
  return {
    ...rest,
    has_case_study: Boolean(case_study && case_study.overview),
    feature_titles: rest.feature_titles ?? ((case_study && case_study.features) || []).map((f) => f.title).slice(0, 8),
  }
}

function single(p) {
  const row = clean(p)
  if (p._pre) {
    delete row.case_study
  } else if (!('case_study' in row)) {
    row.case_study = null
  }
  return row
}

const ok = (body) => ({ status: 200, body: { success: true, data: body } })
const notFound = (what) => ({ status: 404, body: { success: false, error: `${what} not found` } })

function handle(method, pathname, query, body) {
  const key = `${method} ${pathname}`
  if (routes[key] && !routes[key].passthrough) return routes[key]

  if (method === 'POST' && pathname === '/api/contact') {
    if (body && body.website) return { status: 200, body: { success: true } }
    return { status: 201, body: { success: true, data: { id: 1, received_at: new Date().toISOString() } } }
  }
  if (method === 'POST' && pathname === '/api/analytics/track') return { status: 200, body: { success: true } }
  if (method !== 'GET') return { status: 404, body: { success: false, error: 'Not found' } }

  const projects = data.projects || []
  if (pathname === '/api/projects') return ok(projects.filter(isPublic).map(listRow))
  let m = /^\/api\/projects\/slug\/([^/]+)$/.exec(pathname)
  if (m) {
    const p = projects.find((x) => x.slug === decodeURIComponent(m[1]))
    return p && isPublic(p) ? ok(single(p)) : notFound('Project')
  }
  m = /^\/api\/projects\/(\d+)$/.exec(pathname)
  if (m) {
    const p = projects.find((x) => String(x.id) === m[1])
    return p && isPublic(p) ? ok(single(p)) : notFound('Project')
  }

  const posts = data.blog || []
  if (pathname === '/api/blog') {
    const limit = Math.min(Number(query.get('limit')) || 50, 100)
    return ok(posts.slice(0, limit).map(({ content, ...rest }) => clean(rest)))
  }
  m = /^\/api\/blog\/([^/]+)$/.exec(pathname)
  if (m) {
    const p = posts.find((x) => x.slug === decodeURIComponent(m[1]))
    return p ? ok(clean(p)) : notFound('Blog post')
  }

  const lists = {
    '/api/work-history': 'work_history',
    '/api/education': 'education',
    '/api/certifications': 'certifications',
    '/api/learning': 'learning',
    '/api/skills': 'skills',
    '/api/recommendations': 'recommendations',
  }
  if (lists[pathname]) {
    const value = data[lists[pathname]]
    return value === undefined ? notFound('Route') : ok(value.map(clean))
  }
  if (pathname === '/api/content/about') return data.about ? ok(data.about) : notFound('Route')
  if (pathname === '/api/cv') return data.cv ? ok(data.cv) : notFound('Route')

  m = /^\/api\/feature-flags\/public\/([^/]+)$/.exec(pathname)
  if (m) return { status: 200, body: { success: true, enabled: Boolean((data.flags || {})[m[1]]) } }
  if (pathname === '/api/feature-flags/public') return ok(data.flags || {})
  if (pathname === '/api/feature-flags/maintenance') {
    return { status: 200, body: { success: true, maintenance_mode: Boolean((data.flags || {}).maintenance_mode) } }
  }
  if (pathname === '/api/upload/resume') return { status: 200, body: { success: true, ...(data.resume || { available: false, url: null }) } }

  return { status: 404, body: { success: false, error: 'Route not found' } }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    let body = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      body = raw
    }
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Cache-Control': 'no-store',
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers)
      return res.end()
    }
    if (url.pathname === '/__mock/reset') {
      reset()
      res.writeHead(200, headers)
      return res.end(JSON.stringify({ ok: true }))
    }
    if (url.pathname === '/__mock/state') {
      if (body && body.data) data = { ...data, ...body.data }
      if (body && body.routes) routes = { ...routes, ...body.routes }
      res.writeHead(200, headers)
      return res.end(JSON.stringify({ ok: true }))
    }
    if (url.pathname === '/__mock/requests') {
      res.writeHead(200, headers)
      return res.end(JSON.stringify(log))
    }
    if (url.pathname.startsWith('/uploads/')) {
      // Placeholder artwork for fixture images (resolveMediaUrl prefixes the API origin).
      const seed = [...url.pathname].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' })
      return res.end(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${seed},70%,75%)"/><stop offset="1" stop-color="hsl(${(seed + 60) % 360},60%,45%)"/></linearGradient></defs><rect width="1200" height="750" fill="url(#g)"/></svg>`
      )
    }
    log.push({ method: req.method, path: url.pathname, search: url.search, body, ua: req.headers['user-agent'] || '' })
    const override = routes[`${req.method} ${url.pathname}`]
    const out = handle(req.method, url.pathname, url.searchParams, body)
    if (override && override.passthrough) out.delay = override.delay
    setTimeout(() => {
      res.writeHead(out.status, headers)
      res.end(JSON.stringify(out.body))
    }, out.delay || 0)
  })
})

server.listen(PORT, () => console.log(`frontend mock API on http://localhost:${PORT}`))
