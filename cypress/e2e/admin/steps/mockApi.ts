/// <reference types="cypress" />
// In-memory stub of the portfolio API for the admin acceptance specs.
// One cy.intercept catches every `<host>/api/...` call. Default routes follow the accepted
// contracts (H-1 to H-21): `{success, data}` bodies, 400 `{error:'Invalid input', details:[{path,msg}]}`,
// 409 for a duplicate flag key. Scenarios add overrides with `mock.on(...)` and read `mock.log`.

export type Logged = { method: string; path: string; query: Record<string, string>; body: any; at: number }
export type Reply = { statusCode?: number; body?: any; delay?: number }
type Handler = (req: Logged, db: any) => Reply | undefined
type Override = { method: string; path: RegExp; handler: Handler; times: number }

export const ADMIN_URL: string = (Cypress.env('ADMIN_URL') as string) || 'http://localhost:3002'

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

export const mock = {
  db: null as any,
  log: [] as Logged[],
  overrides: [] as Override[],
  signedIn: false,
  delays: {} as Record<string, number>,
  /** The scenario's 'today' (cy.clock); the mock stamps writes with it. */
  now: null as number | null,
  /** Add a one-off (or n-times, or forever with times=Infinity) override for a route. */
  on(method: string, path: RegExp, handler: Handler, times = Infinity) {
    this.overrides.unshift({ method: method.toUpperCase(), path, handler, times })
  },
  calls(method: string, path: RegExp | string) {
    return this.log.filter(
      (l) => l.method === method.toUpperCase() && (typeof path === 'string' ? l.path === path : path.test(l.path)),
    )
  },
}

const ok = (data: any, statusCode = 200): Reply => ({ statusCode, body: { success: true, data } })
const invalid = (details: { path: string; msg: string }[]): Reply => ({
  statusCode: 400,
  body: { success: false, error: 'Invalid input', details },
})

const COLLECTIONS: Record<string, string> = {
  'work-history': 'workHistory',
  education: 'education',
  certifications: 'certifications',
  learning: 'learning',
  skills: 'skills',
  recommendations: 'recommendations',
  'feature-flags': 'flags',
  blog: 'blog',
  projects: 'projects',
}

const projectListRow = (p: any) => {
  const { case_study, content, ...rest } = p
  return { ...rest, has_case_study: !!(case_study && case_study.overview) }
}

function defaultRoute(req: Logged, db: any): Reply {
  const { method, path, body } = req
  const seg = path.replace(/^\/+|\/+$/g, '').split('/')
  // auth
  if (path === '/auth/me') {
    return mock.signedIn ? ok({ user: db.user }) : { statusCode: 401, body: { success: false, error: 'Unauthorized' } }
  }
  if (path === '/auth/login' && method === 'POST') {
    if (body?.email === 'test-admin@example.com' && body?.password === 'test-password-123') {
      mock.signedIn = true
      return ok({ user: db.user, session: { access_token: 'test-access-token-123', refresh_token: 'r', expires_at: 9999999999 } })
    }
    return { statusCode: 401, body: { success: false, error: 'Invalid login credentials' } }
  }
  if (path === '/auth/logout') {
    mock.signedIn = false
    return { statusCode: 200, body: { success: true, message: 'Logged out successfully' } }
  }
  if (path === '/auth/profile' && method === 'PUT') {
    db.user = { ...db.user, ...body }
    return ok({ user: db.user })
  }
  if (path === '/auth/change-password' && method === 'PUT') {
    return { statusCode: 200, body: { success: true, message: 'Password changed' } }
  }
  // projects (H-19 admin reads)
  if (path === '/projects/admin/all' && method === 'GET') return ok(db.projects.map(projectListRow))
  if (seg[0] === 'projects' && seg[1] === 'admin' && seg[2] && method === 'GET') {
    const p = db.projects.find((x: any) => String(x.id) === seg[2])
    return p ? ok(p) : { statusCode: 404, body: { success: false, error: 'Project not found' } }
  }
  if (path === '/blog/admin/all' && method === 'GET') return ok(db.blog)
  // CV (H-21)
  if (path === '/cv/status' && method === 'GET') return ok(db.cvStatus)
  if (path === '/cv/regenerate' && method === 'POST') {
    db.cvStatus = {
      state: 'idle',
      generatedAt: new Date(mock.now ?? Date.now()).toISOString(),
      requestedAt: null,
      startedAt: null,
      error: null,
      pdfUrl: 'https://cdn.example.com/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1',
      size: 188416,
    }
    return ok(db.cvStatus)
  }
  if (path === '/upload/resume' && method === 'GET') return { statusCode: 200, body: db.resume }
  // About (H-16)
  if (path === '/content/about') {
    if (method === 'GET') return ok(db.about)
    if (method === 'PUT') {
      db.about = { ...body, updated_at: '2026-10-27T09:00:00Z' }
      return ok(db.about)
    }
  }
  // Analytics (H-1)
  if (path === '/analytics/summary' && method === 'GET') return ok(db.analytics)
  // flags (H-8)
  if (path === '/feature-flags' && method === 'POST') {
    const name = body?.name
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name || '')) {
      return { statusCode: 400, body: { success: false, error: 'Flag keys use lower case letters, numbers and underscores.' } }
    }
    if (db.flags.some((f: any) => f.name === name)) {
      return { statusCode: 409, body: { success: false, error: `A flag called ${name} already exists.` } }
    }
    const f = { id: nextId(db.flags), name, description: body.description ?? '', enabled: false, created_at: new Date().toISOString() }
    db.flags.push(f)
    return ok(f, 201)
  }
  // generic collections
  const key = COLLECTIONS[seg[0]]
  if (key) {
    const list: any[] = db[key]
    const id = seg[1]
    if (!id && method === 'GET') {
      if (key === 'recommendations') {
        // H-17: sort_order asc, then date desc, then id
        return ok([...list].sort((a, b) => a.sort_order - b.sort_order || String(b.date || '').localeCompare(String(a.date || '')) || a.id - b.id))
      }
      return ok(list)
    }
    if (!id && method === 'POST') {
      const item: any = { id: nextId(list), ...body }
      const unfeatured = unfeature(key, list, item)
      list.push(item)
      return ok(key === 'projects' || key === 'blog' ? { ...item, unfeatured } : item, 201)
    }
    const item = list.find((x: any) => String(x.id) === id)
    if (!item) return { statusCode: 404, body: { success: false, error: 'Not found' } }
    if (method === 'GET') return ok(item)
    if (method === 'PUT') {
      Object.assign(item, body)
      const unfeatured = unfeature(key, list, item)
      return ok(key === 'projects' || key === 'blog' ? { ...item, unfeatured } : item)
    }
    if (method === 'DELETE') {
      list.splice(list.indexOf(item), 1)
      return { statusCode: 200, body: { success: true, message: 'Deleted' } }
    }
  }
  return { statusCode: 404, body: { success: false, error: `QA mock: no route for ${method} ${path}` } }
}

function nextId(list: any[]) {
  return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1
}

function unfeature(key: string, list: any[], item: any): number[] {
  if ((key !== 'projects' && key !== 'blog') || !item.featured) return []
  const off: number[] = []
  list.forEach((x) => {
    if (x !== item && x.featured) {
      x.featured = false
      off.push(x.id)
    }
  })
  return off
}

/** Reset the db from the fixture and install the catch-all intercept. Call once per scenario. */
export function installMockApi(mutate?: (db: any) => void) {
  mock.log = []
  mock.overrides = []
  mock.signedIn = false
  mock.delays = {}
  mock.now = null
  return cy.fixture('admin-content.json').then((fx) => {
    mock.db = clone(fx)
    mutate?.(mock.db)
    const adminHost = new URL(ADMIN_URL).host
    cy.intercept({ url: /:\/\/[^/]+\/api\// }, (req) => {
      const u = new URL(req.url)
      if (u.host === adminHost && !u.pathname.startsWith('/api/')) return
      const path = u.pathname.replace(/^\/api/, '')
      const query: Record<string, string> = {}
      u.searchParams.forEach((v, k) => (query[k] = v))
      let body: any = req.body
      if (typeof body === 'string' && body) {
        try {
          body = JSON.parse(body)
        } catch {
          /* leave as string */
        }
      }
      const entry: Logged = { method: req.method, path, query, body, at: Date.now() }
      mock.log.push(entry)
      let reply: Reply | undefined
      for (const o of mock.overrides) {
        if (o.times > 0 && o.method === req.method && o.path.test(path)) {
          reply = o.handler(entry, mock.db)
          if (reply) {
            o.times -= 1
            break
          }
        }
      }
      if (!reply) reply = defaultRoute(entry, mock.db)
      const d = mock.delays[req.method + ' ' + path]
      if (d && reply.delay == null) reply = { ...reply, delay: d }
      req.reply({ statusCode: reply.statusCode ?? 200, body: reply.body, delay: reply.delay })
    }).as('api')
  })
}
