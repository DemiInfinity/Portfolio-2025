import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchProjects, fetchBlogPosts, fetchLearning, ApiUnavailableError } from '../api'

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
