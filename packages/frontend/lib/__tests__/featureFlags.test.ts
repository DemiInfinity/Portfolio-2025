import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPublicFeatureFlag, SHOW_COLOURWAYS_FLAG, SHOW_MARBL_FLAG } from '../featureFlags'

describe('fetchPublicFeatureFlag', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('exports the flag keys', () => {
    expect(SHOW_COLOURWAYS_FLAG).toBe('show_colourways')
    expect(SHOW_MARBL_FLAG).toBe('show_marbl')
  })

  it('on: returns true and reads the public endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, enabled: true }) }) as any
    expect(await fetchPublicFeatureFlag(SHOW_COLOURWAYS_FLAG)).toBe(true)
    expect((global.fetch as any).mock.calls[0][0]).toMatch(/\/api\/feature-flags\/public\/show_colourways$/)
  })

  it('off: returns false', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, enabled: false }) }) as any
    expect(await fetchPublicFeatureFlag(SHOW_COLOURWAYS_FLAG)).toBe(false)
  })

  it('missing flag (404 or no `enabled`): returns false', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }) as any
    expect(await fetchPublicFeatureFlag(SHOW_COLOURWAYS_FLAG)).toBe(false)
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as any
    expect(await fetchPublicFeatureFlag(SHOW_COLOURWAYS_FLAG)).toBe(false)
  })

  it('failed fetch: returns false', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as any
    expect(await fetchPublicFeatureFlag(SHOW_COLOURWAYS_FLAG)).toBe(false)
  })
})
