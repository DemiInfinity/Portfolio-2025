/**
 * QA acceptance-test harness: an Express app wired like `src/vercel.ts`
 * (trust proxy, global JSON parser, every router from `routes/mount.ts`,
 * notFound + errorHandler), minus helmet/cors/morgan/global rate limit and
 * the Supabase init middleware. Supabase is faked with `mockServices()`.
 *
 * The contact router keeps its rate-limit store in module state, so each app
 * gets a fresh one mounted ahead of the shared router.
 */
import express from 'express'
import { mountApiRoutes } from '../routes/mount'
import { createContactRouter } from '../routes/contact'
import { notFound } from '../middleware/notFound'
import { errorHandler } from '../middleware/errorHandler'

export function buildApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use('/api/contact', createContactRouter())
  mountApiRoutes(app)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

/** Sets env vars for one test; returns a restore function. */
export function withEnv(vars: Record<string, string | undefined>) {
  const saved: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

/** Asserts the shared validation error shape and returns the detail paths. */
export function expectInvalid(res: { status: number; body: any }) {
  expect(res.status).toBe(400)
  expect(res.body.success).toBe(false)
  expect(res.body.error).toBe('Invalid input')
  expect(Array.isArray(res.body.details)).toBe(true)
  expect(res.body.details.length).toBeGreaterThan(0)
  for (const d of res.body.details) {
    expect(typeof d.path).toBe('string')
    expect(typeof d.msg).toBe('string')
  }
  return res.body.details.map((d: any) => d.path) as string[]
}

export const silenceConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
}
