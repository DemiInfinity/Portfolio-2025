import request from 'supertest'
import express from 'express'
import router from '../cv'
import { mockServices } from '../../test/supabaseMock'

const fixtures = () => ({
  work_history: [
    { id: 1, company: 'Old Co', position: 'Dev', start_date: '2020-01-01', end_date: '2024-12-01', achievements: '["A"]', technologies: [], updated_at: '2026-01-01T00:00:00Z' },
    { id: 2, company: 'Cintra', position: 'Software Developer', start_date: '2025-08-01', end_date: null, achievements: [], technologies: [], highlights: ['-80%'], updated_at: '2026-02-01T00:00:00Z' }
  ],
  skills: [
    { id: 1, name: 'Angular', category: 'Frontend', level: 'expert' },
    { id: 2, name: 'Node', category: 'Backend', level: 'advanced' },
    { id: 3, name: 'CSS', category: 'Frontend', level: 'expert' }
  ],
  projects: [
    { id: 1, title: 'LunaLore', slug: 'lunalore', status: 'in_development', featured: true, show_on_site: true, technologies: '["Electron"]', created_at: '2025-01-01T00:00:00Z' },
    { id: 2, title: 'Idea', slug: 'idea', status: 'ideas', show_on_site: true, technologies: [], created_at: '2025-01-01T00:00:00Z' },
    { id: 3, title: 'Hidden', slug: 'hidden', status: 'completed', show_on_site: false, technologies: [], created_at: '2025-01-01T00:00:00Z' }
  ],
  education: [{ id: 1, institution: 'Teesside University', degree: 'BSc', start_date: '2016-09-01', gpa: null, achievements: null }],
  learning: [
    { id: 4, title: 'AI', provider: 'Udemy', status: 'in_progress', progress: 1, start_date: '2025-06-01' },
    { id: 5, title: 'Done', status: 'completed', progress: 100, start_date: '2024-01-01' }
  ],
  certifications: [],
  site_content: [{ key: 'about', value: { cv_profile: 'Stored profile' }, updated_at: '2026-10-20T12:00:00.000Z' }],
  recommendations: []
})

describe('GET /api/cv', () => {
  let app: express.Application
  beforeEach(() => {
    app = express()
    app.use('/api/cv', router)
  })
  afterEach(() => jest.restoreAllMocks())

  it('returns the aggregate with the agreed shape and rules', async () => {
    mockServices({ tables: fixtures() })
    const res = await request(app).get('/api/cv')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    const d = res.body.data
    expect(Object.keys(d).sort()).toEqual(['certifications', 'counts', 'education', 'experience', 'learning', 'profile', 'projects', 'recommendation', 'skills', 'updated_at'])
    expect(d.experience[0]).toMatchObject({ company: 'Cintra', current: true, highlights: ['-80%'] })
    expect(d.experience[1]).toMatchObject({ current: false, achievements: ['A'], highlights: [] })
    expect(d.skills.map((g: any) => g.category)).toEqual(['Backend', 'Frontend'])
    expect(d.skills[1].items.map((i: any) => i.name)).toEqual(['Angular', 'CSS'])
    expect(d.projects.map((p: any) => p.id)).toEqual([1])
    expect(d.projects[0].technologies).toEqual(['Electron'])
    expect(d.learning.map((l: any) => l.id)).toEqual([4])
    expect(d.learning[0]).toEqual({ id: 4, title: 'AI', provider: 'Udemy', description: null, progress: 1, status: 'in_progress', start_date: '2025-06-01', estimated_completion: null })
    expect(d.profile.cv_profile).toBe('Stored profile')
    expect(d.profile.cv_headline).toBe('Full-stack Software Engineer')
    expect(d.recommendation).toBeNull()
    expect(d.counts).toEqual({ experience: 2, projects: 1, skills: 3, education: 1, learning: 1, certifications: 0 })
    expect(d.updated_at).toBe('2026-10-20T12:00:00.000Z')
  })

  it('recommendation: first with show_on_cv by sort order', async () => {
    const t = fixtures()
    t.recommendations = [
      { id: 1, quote: 'Q1', name: 'A', show_on_cv: false, sort_order: 0 },
      { id: 2, quote: 'Q2', name: 'B', show_on_cv: true, sort_order: 2 },
      { id: 3, quote: 'Q3', name: 'C', show_on_cv: true, sort_order: 1 }
    ] as any
    mockServices({ tables: t })
    const res = await request(app).get('/api/cv')
    expect(res.body.data.recommendation.id).toBe(3)
  })

  it('certifications: non-expired first', async () => {
    const t = fixtures()
    t.certifications = [
      { id: 1, name: 'Old', issuer: 'I', issue_date: '2024-01-01', expiry_date: '2020-01-01' },
      { id: 2, name: 'Valid', issuer: 'I', issue_date: '2019-01-01', expiry_date: null }
    ] as any
    mockServices({ tables: t })
    const res = await request(app).get('/api/cv')
    expect(res.body.data.certifications.map((c: any) => c.id)).toEqual([2, 1])
  })

  it('any table error → 500, no partial data', async () => {
    mockServices({ tables: fixtures(), errors: { skills: { message: 'boom' } } })
    const res = await request(app).get('/api/cv')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, error: 'Internal server error' })
  })

  it('works before the v2 migration (no site_content / recommendations tables)', async () => {
    const t: any = fixtures()
    mockServices({
      tables: t,
      errors: {
        site_content: { code: '42P01', message: 'relation "site_content" does not exist' },
        recommendations: { code: 'PGRST205', message: "Could not find the table 'public.recommendations'" }
      }
    })
    const res = await request(app).get('/api/cv')
    expect(res.status).toBe(200)
    expect(res.body.data.profile.cv_profile).toMatch(/^Full-stack software engineer/)
    expect(res.body.data.recommendation).toBeNull()
  })
})
