import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchProjects,
  fetchBlogPosts,
  fetchLearning,
  fetchSkills,
  fetchEducation,
  fetchWorkHistory,
  fetchCv,
  submitContact,
  ApiUnavailableError,
} from '../api'

// Mock fetch globally
global.fetch = vi.fn()

describe('API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        { id: 1, title: 'Project 1', description: 'Description 1' },
        { id: 2, title: 'Project 2', description: 'Description 2' },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockProjects }),
      })

      const result = await fetchProjects()

      expect(result).toEqual(mockProjects)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })

    // Regression test: the backend (Railway) cold-starts when idle. A
    // network failure must be surfaced to callers (so pages can show a
    // visible error/retry state) instead of silently looking like "there
    // are no projects".
    it('should throw ApiUnavailableError on network error instead of silently returning []', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchProjects()).rejects.toBeInstanceOf(ApiUnavailableError)
    })

    it('should throw ApiUnavailableError when response is not ok instead of silently returning []', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(fetchProjects()).rejects.toBeInstanceOf(ApiUnavailableError)
    })

    it('should return an empty array when the API genuinely has no projects', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const result = await fetchProjects()

      expect(result).toEqual([])
    })
  })

  describe('fetchBlogPosts', () => {
    it('should fetch blog posts successfully', async () => {
      const mockPosts = [
        { id: 1, title: 'Post 1', slug: 'post-1' },
        { id: 2, title: 'Post 2', slug: 'post-2' },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosts }),
      })

      const result = await fetchBlogPosts()

      expect(result).toEqual(mockPosts)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/blog')
      )
    })

    it('should throw ApiUnavailableError on network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchBlogPosts()).rejects.toBeInstanceOf(ApiUnavailableError)
    })
  })

  describe('fetchLearning', () => {
    it('should fetch learning items successfully', async () => {
      const mockLearning = [
        { id: 1, title: 'Learning 1', category: 'Frontend' },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLearning }),
      })

      const result = await fetchLearning()

      expect(result).toEqual(mockLearning)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/learning')
      )
    })

    it('should throw ApiUnavailableError on network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchLearning()).rejects.toBeInstanceOf(ApiUnavailableError)
    })
  })
})

describe('new fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchBlogPosts passes ?limit=', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
    await fetchBlogPosts({ limit: 100 })
    expect((global.fetch as any).mock.calls[0][0]).toMatch(/\/blog\?limit=100$/)
  })

  it('fetchSkills requests /api/skills', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'TS' }] }) })
    const skills = await fetchSkills()
    expect(skills).toEqual([{ id: 1, name: 'TS' }])
    expect((global.fetch as any).mock.calls[0][0]).toMatch(/\/api\/skills$/)
  })

  it('fetchEducation maps gpa to grade', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 1, institution: 'Teesside University', degree: 'BSc', gpa: '2:1' }] }),
    })
    const [entry] = await fetchEducation()
    expect(entry.grade).toBe('2:1')
  })

  it('fetchWorkHistory always returns arrays for highlights', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 1, company: 'A', position: 'Dev', start_date: '2025-01-01' }] }),
    })
    const [role] = await fetchWorkHistory()
    expect(role.highlights).toEqual([])
    expect(role.achievements).toEqual([])
  })

  it('fetchCv throws when the endpoint is missing (404)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchCv()).rejects.toBeInstanceOf(ApiUnavailableError)
  })
})

describe('submitContact', () => {
  const payload = {
    kind: 'role' as const,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'Hi',
    website: '' as const,
    source_path: '/',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the exact JSON body to /api/contact', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 201 })
    const result = await submitContact(payload)
    expect(result).toEqual({ ok: true })
    const [url, init] = (global.fetch as any).mock.calls[0]
    expect(url).toMatch(/\/api\/contact$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(payload)
  })

  it('maps 400 details to field names', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, details: [{ path: 'email', msg: 'bad' }] }),
    })
    expect(await submitContact(payload)).toEqual({ ok: false, reason: 'invalid', fields: ['email'] })
  })

  it('reports 429, 500 and network errors without throwing', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 429 })
    expect(await submitContact(payload)).toEqual({ ok: false, reason: 'rate_limited' })
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 })
    expect(await submitContact(payload)).toEqual({ ok: false, reason: 'error' })
    ;(global.fetch as any).mockRejectedValueOnce(new Error('offline'))
    expect(await submitContact(payload)).toEqual({ ok: false, reason: 'error' })
  })
})
