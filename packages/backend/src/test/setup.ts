// Global test setup
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Mock Supabase service for tests
jest.mock('../services/SupabaseService', () => ({
  SupabaseService: jest.fn().mockImplementation(() => ({
    getClient: jest.fn(),
    select: jest.fn(),
    selectOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Set test timeout
jest.setTimeout(10000)


// Background work (CV rebuilds) is dropped by default so route tests don't
// leave debounce timers running; cvBuild tests install their own runner.
import { setBackgroundRunner } from '../utils/background'
setBackgroundRunner(() => {})

// Test HTTP transport (fixes intermittent "socket hang up" and wrong-status
// failures in route tests). supertest listens on `::` but always connects to
// 127.0.0.1. On macOS another process (Cypress, VS Code helpers, another jest
// worker) can bind 127.0.0.1 on that same ephemeral port, and then the request
// reaches the wrong server. So every throwaway test server binds 127.0.0.1
// itself (the kernel keeps that port unique), and the request waits for the
// 'listening' event. Keep-alive is off so a pooled socket to an already
// closed server is never reused.
import http from 'http'
import { once } from 'events'
import supertest from 'supertest'

http.globalAgent = new http.Agent({ keepAlive: false })

const TestProto = (supertest as any).Test.prototype
const originalEnd = TestProto.end
TestProto.serverAddress = function (app: http.Server, path: string) {
  const addr = app.address()
  if (addr && typeof addr === 'object') return `http://127.0.0.1:${addr.port}${path}`
  this._server = app.listen(0, '127.0.0.1')
  this._listening = once(app, 'listening').then(() => {
    this.url = `http://127.0.0.1:${(app.address() as any).port}${path}`
  })
  return `http://127.0.0.1${path}`
}
TestProto.end = function (fn: any) {
  if (!this._listening) return originalEnd.call(this, fn)
  const ready = this._listening
  this._listening = null
  ready.then(() => originalEnd.call(this, fn), (err: Error) => fn(err))
  return this
}
