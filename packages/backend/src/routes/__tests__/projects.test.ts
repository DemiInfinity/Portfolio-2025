import request from 'supertest'
import express from 'express'
import projectsRouter from '../projects'
import { mockServices } from '../../test/supabaseMock'

describe('Projects API', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/projects', projectsRouter)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('GET /api/projects', () => {
    it('returns every project, featured first, with array fields parsed', async () => {
      mockServices({
        tables: {
          projects: [
            {
              id: 1,
              title: 'Older',
              slug: 'older',
              technologies: '["React","TypeScript"]',
              images: null,
              featured: false,
              created_at: '2025-01-01T00:00:00.000Z'
            },
            {
              id: 2,
              title: 'Spotlight',
              slug: 'spotlight',
              technologies: ['Electron'],
              images: '["a.png"]',
              featured: true,
              created_at: '2024-01-01T00:00:00.000Z'
            }
          ]
        }
      })

      const response = await request(app).get('/api/projects')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].id).toBe(2)
      expect(response.body.data[0].images).toEqual(['a.png'])
      expect(response.body.data[1].technologies).toEqual(['React', 'TypeScript'])
      expect(response.body.data[1].images).toEqual([])
    })

    it('returns 500 with success:false when the query fails', async () => {
      mockServices({ errors: { projects: { message: 'Database error' } } })

      const response = await request(app).get('/api/projects')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
    })
  })
})
