import request from 'supertest'
import express from 'express'
import education from '../education'
import certifications from '../certifications'
import { mockServices, authHeader } from '../../test/supabaseMock'

describe('Education and certifications validation', () => {
  let app: express.Application
  let db: ReturnType<typeof mockServices>

  beforeEach(() => {
    db = mockServices({ tables: { education: [{ id: 1, institution: 'T', degree: 'BSc', start_date: '2016-09-01', gpa: '2:1', achievements: null }] } })
    app = express()
    app.use(express.json())
    app.use('/api/education', education)
    app.use('/api/certifications', certifications)
  })
  afterEach(() => jest.restoreAllMocks())

  it('education POST without institution → 400 Invalid input with path institution', async () => {
    const res = await request(app).post('/api/education').set(authHeader()).send({ degree: 'BSc', start_date: '2016-09' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
    expect(res.body.details.map((d: any) => d.path)).toContain('institution')
  })

  it('education POST normalises dates and truncates grade', async () => {
    const res = await request(app).post('/api/education').set(authHeader())
      .send({ institution: 'T', degree: 'BSc', start_date: '2016-09', end_date: '2020-06', grade: 'First class honours' })
    expect(res.status).toBe(201)
    const payload = db.callsFor('education', 'insert')[0].payload
    expect(payload).toMatchObject({ start_date: '2016-09-01', end_date: '2020-06-01', gpa: 'First clas', achievements: [] })
    expect(res.body.data.grade).toBe('First clas')
  })

  it('education GET returns grade and achievements array', async () => {
    const res = await request(app).get('/api/education')
    expect(res.body.data[0]).toMatchObject({ grade: '2:1', achievements: [] })
  })

  it('education PUT on a missing id → 404', async () => {
    const res = await request(app).put('/api/education/42').set(authHeader()).send({ institution: 'T', degree: 'B', start_date: '2016-09' })
    expect(res.status).toBe(404)
  })

  it('certification POST without issuer → 400 with path issuer; bad date → 400', async () => {
    const a = await request(app).post('/api/certifications').set(authHeader()).send({ name: 'N', issue_date: '2024-01' })
    expect(a.status).toBe(400)
    expect(a.body.details.map((d: any) => d.path)).toContain('issuer')
    const b = await request(app).post('/api/certifications').set(authHeader()).send({ name: 'N', issuer: 'I', issue_date: 'Jan 2024' })
    expect(b.status).toBe(400)
    expect(b.body.details[0].path).toBe('issue_date')
  })

  it('certification POST stores month dates and skills list', async () => {
    const res = await request(app).post('/api/certifications').set(authHeader())
      .send({ name: 'N', issuer: 'I', issue_date: '2024-01', expiry_date: '', skills: 'a, b' })
    expect(res.status).toBe(201)
    expect(db.callsFor('certifications', 'insert')[0].payload).toMatchObject({ issue_date: '2024-01-01', expiry_date: null, skills: ['a', 'b'] })
    expect(res.body.data.skills).toEqual(['a', 'b'])
  })
})
