/**
 * In-memory fake of the Supabase client used by the routes, for jest tests.
 *
 * Usage:
 *   const db = mockServices({ tables: { projects: [{ id: 1, title: 'A' }] } })
 *   await request(app).get('/api/projects')
 *   expect(db.calls.find(c => c.table === 'projects' && c.op === 'update'))...
 *
 * `mockServices` spies on `getServices()` (src/services) so routes receive a
 * fake `supabaseService` whose `getClient()` is a chainable query builder over
 * `tables`, and whose helper methods (select, selectOne, insert, update,
 * delete) behave like the real SupabaseService on top of that client.
 *
 * Auth: `auth.getUser(token)` resolves the users map. Defaults: token `good`
 * is an admin (user_metadata.role 'admin'), token `viewer` is a viewer.
 */
import * as services from '../services'

export type Row = Record<string, any>
export type DbError = { message: string; code?: string; details?: string }

export interface RecordedCall {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  columns?: string
  payload?: any
  options?: any
  filters: Filter[]
  orders: { column: string; ascending: boolean }[]
  range?: [number, number]
  limit?: number
}

type Filter =
  | { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'like' | 'ilike'; column: string; value: any }
  | { type: 'in'; column: string; value: any[] }
  | { type: 'not'; column: string; operator: string; value: any }
  | { type: 'or'; expression: string }

export interface MockUser {
  id: string
  email: string
  user_metadata?: Row
  app_metadata?: Row
}

export interface StoredObject {
  name: string
  size: number
  contentType?: string
  created_at: string
  updated_at: string
  metadata?: Row
  user_metadata?: Row
}

export interface MockOptions {
  tables?: Record<string, Row[]>
  /** token -> user; merged over the default `good` (admin) and `viewer` users */
  users?: Record<string, MockUser>
  /** email -> password, for signInWithPassword */
  passwords?: Record<string, string>
  /** table -> error returned by every query on that table (or a function deciding per call) */
  errors?: Record<string, DbError | ((call: RecordedCall) => DbError | null)>
  /** table -> columns that do not exist yet (selecting them yields PostgREST 42703) */
  missingColumns?: Record<string, string[]>
  /** bucket -> path -> object */
  storage?: Record<string, Record<string, Partial<StoredObject>>>
  storageErrors?: Partial<Record<'upload' | 'list' | 'remove', DbError>>
}

export const ADMIN_TOKEN = 'good'
export const VIEWER_TOKEN = 'viewer'

export const DEFAULT_USERS: Record<string, MockUser> = {
  [ADMIN_TOKEN]: {
    id: 'admin-user',
    email: 'admin@example.com',
    user_metadata: { role: 'admin', name: 'Admin' },
    app_metadata: {}
  },
  [VIEWER_TOKEN]: {
    id: 'viewer-user',
    email: 'viewer@example.com',
    user_metadata: { role: 'viewer', name: 'Viewer' },
    app_metadata: {}
  }
}

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

function compare(a: any, b: any): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a) < String(b) ? -1 : 1
}

function likeToRegex(pattern: string, insensitive: boolean): RegExp {
  const escaped = String(pattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, insensitive ? 'i' : '')
}

function loose(value: any): any {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  return value
}

function matchesSimple(row: Row, type: string, column: string, value: any): boolean {
  const cell = row[column]
  switch (type) {
    case 'eq':
      return cell !== undefined && cell !== null && String(cell) === String(value)
    case 'neq':
      return cell === undefined || cell === null ? false : String(cell) !== String(value)
    case 'gt':
      return compare(cell, value) > 0
    case 'gte':
      return compare(cell, value) >= 0
    case 'lt':
      return compare(cell, value) < 0
    case 'lte':
      return compare(cell, value) <= 0
    case 'is':
      return value === null ? cell === null || cell === undefined : cell === value
    case 'like':
      return typeof cell === 'string' && likeToRegex(value, false).test(cell)
    case 'ilike':
      return typeof cell === 'string' && likeToRegex(value, true).test(cell)
    case 'in':
      return Array.isArray(value) && value.map(String).includes(String(cell))
    default:
      return true
  }
}

function matches(row: Row, f: Filter): boolean {
  if (f.type === 'or') {
    return f.expression.split(',').some((part) => {
      const [column, op, ...rest] = part.split('.')
      return matchesSimple(row, op, column, loose(rest.join('.')))
    })
  }
  if (f.type === 'not') {
    return !matchesSimple(row, f.operator, f.column, loose(f.value))
  }
  return matchesSimple(row, f.type, f.column, f.value)
}

function project(row: Row, columns: string | undefined): Row {
  if (!columns || columns.trim() === '*') return clone(row)
  const out: Row = {}
  for (const raw of columns.split(',')) {
    const col = raw.trim()
    if (!col) continue
    if (col in row) out[col] = clone(row[col])
  }
  return out
}

class FakeQuery implements PromiseLike<any> {
  private call: RecordedCall
  private singleMode: null | 'single' | 'maybe' = null
  private returning = false
  private selectOptions: any

  constructor(private state: MockState, table: string) {
    this.call = { table, op: 'select', filters: [], orders: [] }
  }

  select(columns = '*', options?: any) {
    if (this.call.op === 'select') {
      this.call.columns = columns
      this.selectOptions = options
    } else {
      this.returning = true
      this.call.columns = columns
    }
    return this
  }
  insert(payload: any, options?: any) {
    this.call.op = 'insert'
    this.call.payload = clone(payload)
    this.call.options = options
    return this
  }
  upsert(payload: any, options?: any) {
    this.call.op = 'upsert'
    this.call.payload = clone(payload)
    this.call.options = options
    return this
  }
  update(payload: any) {
    this.call.op = 'update'
    this.call.payload = clone(payload)
    return this
  }
  delete(options?: any) {
    this.call.op = 'delete'
    this.call.options = options
    if (options?.count) this.selectOptions = { count: options.count }
    return this
  }
  eq(column: string, value: any) { this.call.filters.push({ type: 'eq', column, value }); return this }
  neq(column: string, value: any) { this.call.filters.push({ type: 'neq', column, value }); return this }
  gt(column: string, value: any) { this.call.filters.push({ type: 'gt', column, value }); return this }
  gte(column: string, value: any) { this.call.filters.push({ type: 'gte', column, value }); return this }
  lt(column: string, value: any) { this.call.filters.push({ type: 'lt', column, value }); return this }
  lte(column: string, value: any) { this.call.filters.push({ type: 'lte', column, value }); return this }
  is(column: string, value: any) { this.call.filters.push({ type: 'is', column, value }); return this }
  like(column: string, value: any) { this.call.filters.push({ type: 'like', column, value }); return this }
  ilike(column: string, value: any) { this.call.filters.push({ type: 'ilike', column, value }); return this }
  in(column: string, value: any[]) { this.call.filters.push({ type: 'in', column, value }); return this }
  not(column: string, operator: string, value: any) {
    this.call.filters.push({ type: 'not', column, operator, value })
    return this
  }
  or(expression: string) { this.call.filters.push({ type: 'or', expression }); return this }
  order(column: string, options?: { ascending?: boolean }) {
    this.call.orders.push({ column, ascending: options?.ascending !== false })
    return this
  }
  range(from: number, to: number) { this.call.range = [from, to]; return this }
  limit(n: number) { this.call.limit = n; return this }
  single() { this.singleMode = 'single'; return this }
  maybeSingle() { this.singleMode = 'maybe'; return this }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected)
  }

  private execute(): any {
    const { state, call } = this
    state.calls.push(call)

    const injected = state.errors[call.table]
    const err = typeof injected === 'function' ? injected(call) : injected
    if (err) return { data: null, error: err, count: null }

    if (call.columns || call.filters.length) {
      const missing = state.missingColumns[call.table] || []
      const wanted = (call.columns || '').split(',').map((c) => c.trim())
      // PostgREST also rejects filters and ordering on a column that doesn't exist.
      for (const f of call.filters) if ('column' in f) wanted.push(f.column)
      for (const o of call.orders) wanted.push(o.column)
      const hit = wanted.find((c) => missing.includes(c))
      if (hit) {
        return {
          data: null,
          error: { code: '42703', message: `column ${call.table}.${hit} does not exist` },
          count: null
        }
      }
    }

    if (call.op === 'insert' || call.op === 'update' || call.op === 'upsert') {
      const missing = state.missingColumns[call.table] || []
      const payloads: Row[] = Array.isArray(call.payload) ? call.payload : [call.payload]
      const hit = payloads.flatMap((p) => Object.keys(p || {})).find((k) => missing.includes(k))
      if (hit) {
        return {
          data: null,
          error: { code: 'PGRST204', message: `Could not find the '${hit}' column of '${call.table}' in the schema cache` },
          count: null
        }
      }
    }

    const rows = (state.tables[call.table] = state.tables[call.table] || [])
    const filtered = () => rows.filter((r) => call.filters.every((f) => matches(r, f)))
    let result: Row[] = []

    switch (call.op) {
      case 'select': {
        result = filtered()
        break
      }
      case 'insert':
      case 'upsert': {
        const payloads: Row[] = Array.isArray(call.payload) ? call.payload : [call.payload]
        const conflict: string | undefined = call.options?.onConflict
        for (const p of payloads) {
          if (call.op === 'upsert' && conflict) {
            const existing = rows.find((r) => String(r[conflict]) === String(p[conflict]))
            if (existing) {
              if (!call.options?.ignoreDuplicates) Object.assign(existing, clone(p))
              continue
            }
          }
          const unique = state.unique[call.table] || []
          for (const col of unique) {
            if (p[col] !== undefined && rows.some((r) => String(r[col]) === String(p[col]))) {
              return {
                data: null,
                error: { code: '23505', message: `duplicate key value violates unique constraint "${call.table}_${col}_key"` },
                count: null
              }
            }
          }
          const id = rows.reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0) + 1
          const now = new Date().toISOString()
          const row = { id, created_at: now, updated_at: now, ...clone(p) }
          rows.push(row)
          result.push(row)
        }
        break
      }
      case 'update': {
        result = filtered()
        for (const r of result) Object.assign(r, clone(call.payload))
        break
      }
      case 'delete': {
        result = filtered()
        state.tables[call.table] = rows.filter((r) => !result.includes(r))
        break
      }
    }

    if (call.op === 'select') {
      for (const o of [...call.orders].reverse()) {
        result = [...result].sort((a, b) => {
          const c = compare(a[o.column], b[o.column])
          return o.ascending ? c : -c
        })
      }
      if (call.range) result = result.slice(call.range[0], call.range[1] + 1)
      if (call.limit !== undefined) result = result.slice(0, call.limit)
    }

    const count = this.selectOptions?.count === 'exact' ? result.length : null
    if (this.selectOptions?.head) return { data: null, error: null, count }

    if (call.op !== 'select' && !this.returning) {
      return { data: null, error: null, count }
    }

    const data = result.map((r) => project(r, call.columns))
    if (this.singleMode === 'single') {
      if (data.length !== 1) {
        return {
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
          count
        }
      }
      return { data: data[0], error: null, count }
    }
    if (this.singleMode === 'maybe') {
      if (data.length > 1) {
        return { data: null, error: { code: 'PGRST116', message: 'multiple rows returned' }, count }
      }
      return { data: data[0] ?? null, error: null, count }
    }
    return { data, error: null, count }
  }
}

interface MockState {
  tables: Record<string, Row[]>
  calls: RecordedCall[]
  errors: Record<string, DbError | ((call: RecordedCall) => DbError | null)>
  missingColumns: Record<string, string[]>
  unique: Record<string, string[]>
}

export function createFakeClient(options: MockOptions = {}) {
  const state: MockState = {
    tables: clone(options.tables || {}),
    calls: [],
    errors: options.errors || {},
    missingColumns: options.missingColumns || {},
    unique: { feature_flags: ['name'] }
  }
  const users: Record<string, MockUser> = clone({ ...DEFAULT_USERS, ...(options.users || {}) })
  const passwords: Record<string, string> = { ...(options.passwords || {}) }

  const storage: Record<string, Record<string, StoredObject>> = {}
  for (const [bucket, objects] of Object.entries(options.storage || {})) {
    storage[bucket] = {}
    for (const [p, obj] of Object.entries(objects)) {
      const now = new Date().toISOString()
      storage[bucket][p] = {
        name: p.split('/').pop() || p,
        size: 0,
        created_at: now,
        updated_at: now,
        ...obj
      } as StoredObject
    }
  }
  const storageErrors = options.storageErrors || {}

  const userResult = (u: MockUser | undefined) =>
    u ? { data: { user: clone(u) }, error: null } : { data: { user: null }, error: { message: 'Invalid token' } }

  const auth = {
    getUser: jest.fn(async (token?: string) => userResult(token ? users[token] : undefined)),
    signInWithPassword: jest.fn(async ({ email, password }: { email: string; password: string }) => {
      const user = Object.values(users).find((u) => u.email === email)
      if (!user || passwords[email] !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
      }
      const token = Object.keys(users).find((t) => users[t] === user) as string
      return {
        data: {
          user: clone(user),
          session: { access_token: token, refresh_token: `refresh-${token}`, expires_at: 9999999999 }
        },
        error: null
      }
    }),
    signUp: jest.fn(async () => ({ data: { user: null, session: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    refreshSession: jest.fn(async () => ({ data: { session: null }, error: { message: 'Invalid refresh token' } })),
    admin: {
      updateUserById: jest.fn(async (id: string, attrs: Row) => {
        const user = Object.values(users).find((u) => u.id === id)
        if (!user) return { data: { user: null }, error: { message: 'User not found' } }
        if (attrs.email) user.email = attrs.email
        if (attrs.user_metadata) user.user_metadata = { ...user.user_metadata, ...attrs.user_metadata }
        if (attrs.password) passwords[user.email] = attrs.password
        return { data: { user: clone(user) }, error: null }
      })
    }
  }

  const storageApi = {
    from: jest.fn((bucket: string) => {
      const objects = (storage[bucket] = storage[bucket] || {})
      return {
        upload: jest.fn(async (p: string, body: any, opts: Row = {}) => {
          if (storageErrors.upload) return { data: null, error: storageErrors.upload }
          if (objects[p] && !opts.upsert) return { data: null, error: { message: 'The resource already exists' } }
          const now = new Date().toISOString()
          objects[p] = {
            name: p.split('/').pop() || p,
            size: body?.length ?? 0,
            contentType: opts.contentType,
            created_at: objects[p]?.created_at || now,
            updated_at: now,
            metadata: { size: body?.length ?? 0, mimetype: opts.contentType },
            user_metadata: opts.metadata
          }
          return { data: { path: p }, error: null }
        }),
        list: jest.fn(async (prefix = '', opts: Row = {}) => {
          if (storageErrors.list) return { data: null, error: storageErrors.list }
          const dir = prefix ? `${prefix.replace(/\/+$/, '')}/` : ''
          const out = Object.entries(objects)
            .filter(([p]) => p.startsWith(dir) && !p.slice(dir.length).includes('/'))
            .map(([p, o]) => ({
              id: p,
              name: p.slice(dir.length),
              created_at: o.created_at,
              updated_at: o.updated_at,
              metadata: o.metadata ?? { size: o.size, mimetype: o.contentType },
              ...(o.user_metadata ? { user_metadata: o.user_metadata } : {})
            }))
            .filter((o) => !opts.search || o.name.includes(opts.search))
          return { data: out, error: null }
        }),
        remove: jest.fn(async (paths: string[]) => {
          if (storageErrors.remove) return { data: null, error: storageErrors.remove }
          const removed = paths.filter((p) => objects[p])
          for (const p of removed) delete objects[p]
          return { data: removed.map((name) => ({ name })), error: null }
        }),
        getPublicUrl: jest.fn((p: string) => ({
          data: { publicUrl: `https://storage.test/${bucket}/${p}` }
        }))
      }
    })
  }

  const client = {
    from: jest.fn((table: string) => new FakeQuery(state, table)),
    auth,
    storage: storageApi
  }

  return { client, state, users, passwords, storage }
}

/** A fake SupabaseService with the same helper semantics as the real one. */
export function createFakeService(client: any) {
  return {
    getClient: jest.fn(() => client),
    select: jest.fn(async (table: string, columns = '*', conditions?: Row) => {
      let query = client.from(table).select(columns)
      if (conditions) for (const [k, v] of Object.entries(conditions)) query = query.eq(k, v)
      const { data, error } = await query
      if (error) throw error
      return data || []
    }),
    selectOne: jest.fn(async (table: string, id: number | string, columns = '*') => {
      const { data, error } = await client.from(table).select(columns).eq('id', id).single()
      if (error) throw error
      return data
    }),
    insert: jest.fn(async (table: string, payload: Row) => {
      const { data, error } = await client.from(table).insert(payload).select().single()
      if (error) throw error
      return data
    }),
    update: jest.fn(async (table: string, id: number | string, payload: Row) => {
      const { data, error } = await client.from(table).update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    }),
    delete: jest.fn(async (table: string, id: number | string) => {
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw error
      return true
    })
  }
}

/**
 * Wires `getServices()` to a fresh fake. Returns handles for assertions.
 * Call in `beforeEach`; `jest.restoreAllMocks()` (or a new call) resets it.
 */
export function mockServices(options: MockOptions = {}) {
  const fake = createFakeClient(options)
  const supabaseService = createFakeService(fake.client)
  jest.spyOn(services, 'getServices').mockReturnValue({ supabaseService } as any)
  return {
    client: fake.client,
    supabaseService,
    tables: fake.state.tables,
    calls: fake.state.calls,
    users: fake.users,
    passwords: fake.passwords,
    storage: fake.storage,
    /** Recorded calls for one table, optionally one operation. */
    callsFor(table: string, op?: RecordedCall['op']) {
      return fake.state.calls.filter((c) => c.table === table && (!op || c.op === op))
    },
    rows(table: string) {
      return fake.state.tables[table] || []
    }
  }
}

export const authHeader = (token: string = ADMIN_TOKEN) => ({ Authorization: `Bearer ${token}` })
