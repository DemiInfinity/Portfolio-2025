import request from 'supertest'
import express from 'express'
import keepalive from '../../routes/keepalive'
import { purgeOldAnalytics, purgeOldContactMessages } from '../analyticsRetention'
import { mockServices } from '../../test/supabaseMock'

const NOW = new Date('2026-10-30T02:00:00.000Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString()

describe('analytics retention (12 months)', () => {
  let log: jest.SpyInstance
  let err: jest.SpyInstance
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {})
    err = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  const rows = () => [
    { id: 1, created_at: daysAgo(400) },
    { id: 2, created_at: daysAgo(365.5) },
    { id: 3, created_at: daysAgo(364) },
    { id: 4, created_at: daysAgo(1) }
  ]

  it('deletes rows older than 365 days, keeps newer ones, logs the count', async () => {
    const db = mockServices({ tables: { analytics: rows() } })
    const result = await purgeOldAnalytics(NOW)
    expect(result).toEqual({ deleted: 2, cutoff: daysAgo(365) })
    expect(db.rows('analytics').map((r) => r.id)).toEqual([3, 4])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('deleted 2 rows'))
    const call = db.callsFor('analytics', 'delete')[0]
    expect(call.filters).toEqual([{ type: 'lt', column: 'created_at', value: daysAgo(365) }])
  })

  it('is idempotent: a second run deletes nothing', async () => {
    const db = mockServices({ tables: { analytics: rows() } })
    await purgeOldAnalytics(NOW)
    expect(await purgeOldAnalytics(NOW)).toEqual({ deleted: 0, cutoff: daysAgo(365) })
    expect(db.rows('analytics')).toHaveLength(2)
  })

  it('swallows a database error and reports it', async () => {
    mockServices({ errors: { analytics: { message: 'timeout' } } })
    await expect(purgeOldAnalytics(NOW)).resolves.toEqual({ error: 'timeout', cutoff: daysAgo(365) })
    expect(err).toHaveBeenCalled()
  })

  it('keepalive runs the purge and still answers 200 when the purge fails', async () => {
    const app = express().use('/api/keepalive', keepalive)
    mockServices({ tables: {
      blog_posts: [{ id: 1 }],
      analytics: [{ id: 1, created_at: '2020-01-01T00:00:00Z' }],
      contact_messages: [{ id: 1, created_at: '2020-01-01T00:00:00Z' }, { id: 2, created_at: '2020-02-01T00:00:00Z' }, { id: 3, created_at: new Date().toISOString() }]
    } })
    const ok = await request(app).get('/api/keepalive')
    expect(ok.status).toBe(200)
    expect(ok.body.analytics_purged).toBe(1)
    expect(ok.body.contact_purged).toBe(2)

    mockServices({ tables: { blog_posts: [{ id: 1 }] }, errors: { analytics: { message: 'boom' }, contact_messages: { message: 'boom' } } })
    const failed = await request(app).get('/api/keepalive')
    expect(failed.status).toBe(200)
    expect(failed.body.success).toBe(true)
    expect(failed.body.analytics_purged).toBeNull()
    expect(failed.body.contact_purged).toBeNull()
  })

  describe('contact messages (D-10)', () => {
    const msgs = () => [
      { id: 1, email: 'a@x.co', created_at: daysAgo(500) },
      { id: 2, email: 'b@x.co', created_at: daysAgo(366) },
      { id: 3, email: 'c@x.co', created_at: daysAgo(300) },
      { id: 4, email: 'd@x.co', created_at: daysAgo(0) }
    ]

    it('deletes messages older than 365 days, keeps newer ones, logs the count', async () => {
      const db = mockServices({ tables: { contact_messages: msgs() } })
      expect(await purgeOldContactMessages(NOW)).toEqual({ deleted: 2, cutoff: daysAgo(365) })
      expect(db.rows('contact_messages').map((r) => r.id)).toEqual([3, 4])
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Contact messages retention: deleted 2 rows'))
      expect(db.callsFor('contact_messages', 'delete')[0].filters).toEqual([{ type: 'lt', column: 'created_at', value: daysAgo(365) }])
    })

    it('is idempotent', async () => {
      mockServices({ tables: { contact_messages: msgs() } })
      await purgeOldContactMessages(NOW)
      expect(await purgeOldContactMessages(NOW)).toEqual({ deleted: 0, cutoff: daysAgo(365) })
    })

    it('swallows a database error', async () => {
      mockServices({ errors: { contact_messages: { code: '42P01', message: 'relation "contact_messages" does not exist' } } })
      await expect(purgeOldContactMessages(NOW)).resolves.toMatchObject({ error: expect.stringContaining('does not exist') })
      expect(err).toHaveBeenCalled()
    })

    it('an analytics failure does not stop the contact purge (and vice versa)', async () => {
      const app = express().use('/api/keepalive', keepalive)
      mockServices({ tables: { blog_posts: [{ id: 1 }], contact_messages: msgs() }, errors: { analytics: { message: 'boom' } } })
      const res = await request(app).get('/api/keepalive')
      expect(res.status).toBe(200)
      expect(res.body.analytics_purged).toBeNull()
      expect(res.body.contact_purged).toBe(2)
    })
  })
})
