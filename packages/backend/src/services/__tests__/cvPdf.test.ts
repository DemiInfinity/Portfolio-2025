import { renderCvPdf, cvContentHash, dateRange, monthYear } from '../cvPdf'
import type { CvData } from '../cvData'
import { ABOUT_DEFAULTS } from '../siteContent'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse/lib/pdf-parse.js')

function fixture(over: Partial<CvData> = {}): CvData {
  const roles = ['Cintra HR & Payrolls', 'PASS Ltd', '3T Global', 'Acme Learning'].map((company, i) => ({
    id: i + 1, position: 'Software Developer', company, location: 'Newcastle, UK · Remote',
    start_date: `202${4 - i}-02-01`, end_date: i === 0 ? null : `202${5 - i}-01-01`, current: i === 0,
    achievements: ['Architected and delivered an Angular component library from scratch.', 'Cut lookup time by 60%.'],
    highlights: [], technologies: [], description: '', company_url: null
  }))
  const categories = ['Frontend', 'Backend', 'Cloud', 'Tools']
  const skills = categories.map((category, c) => ({
    category,
    items: Array.from({ length: 6 }, (_, i) => ({ id: c * 10 + i, name: `${category} skill ${i + 1}`, level: 'expert' }))
  }))
  return {
    updated_at: '2026-10-20T12:00:00.000Z',
    profile: { cv_headline: ABOUT_DEFAULTS.cv_headline, cv_profile: ABOUT_DEFAULTS.cv_profile, cv_ai_workflow: ABOUT_DEFAULTS.cv_ai_workflow, contact: ABOUT_DEFAULTS.contact },
    recommendation: null,
    experience: roles,
    skills,
    projects: [{ id: 1, title: 'LunaLore', description: 'A creator tool.', technologies: ['Electron', 'React'] }],
    education: [{ id: 1, institution: 'Teesside University', degree: 'BSc', field_of_study: 'Computer Science', start_date: '2016-09-01', end_date: '2020-06-01', achievements: [] }],
    learning: [{ id: 4, title: 'The AI Engineer Course 2025', provider: 'Udemy', progress: 1, status: 'in_progress' }],
    certifications: [],
    counts: { experience: 4, projects: 1, skills: 24, education: 1, learning: 1, certifications: 0 },
    ...over
  }
}

const flat = (s: string) => s.replace(/\s+/g, ' ')

describe('renderCvPdf', () => {
  it('produces a small, real PDF with the headline and every company as text', async () => {
    const started = Date.now()
    const buf = await renderCvPdf(fixture())
    const took = Date.now() - started
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buf.length).toBeLessThan(500 * 1024)
    expect(took).toBeLessThan(2000)
    const { text, numpages } = await pdfParse(buf)
    const t = flat(text)
    expect(t).toContain('Demi Taylor Nimmo')
    expect(t).toContain('Full-stack Software Engineer')
    for (const c of ['Cintra HR & Payrolls', 'PASS Ltd', '3T Global', 'Acme Learning']) expect(t).toContain(c)
    expect(t).toContain('The AI Engineer Course 2025 (Udemy)')
    expect(t).toContain('Phone available on request')
    expect(t).toContain(`Page 1 of ${numpages}`)
    expect(t).toMatch(/Feb 2024 – Present/)
    expect(t).not.toMatch(/\+44|07\d{3}/) // no phone number
  })

  it('omits Recommendation and Certifications headings when there are none', async () => {
    const { text } = await pdfParse(await renderCvPdf(fixture()))
    expect(text).not.toContain('Recommendation')
    expect(text).not.toContain('Certifications')
  })

  it('includes them when present', async () => {
    const buf = await renderCvPdf(fixture({
      recommendation: { id: 1, quote: 'Upbeat and friendly.', name: 'Adam Mellor', role: 'Team lead', company: '3T Global', relationship: 'managed Demi directly' } as any,
      certifications: [{ id: 1, name: 'AWS Cloud Practitioner', issuer: 'AWS', issue_date: '2024-03-01' }]
    }))
    const t = flat((await pdfParse(buf)).text)
    expect(t).toContain('Recommendation')
    expect(t).toContain('Adam Mellor')
    expect(t).toContain('Certifications')
    expect(t).toContain('AWS Cloud Practitioner')
  })
})

describe('helpers', () => {
  it('dates', () => {
    expect(monthYear('2025-08-01')).toBe('Aug 2025')
    expect(dateRange('2025-08-01', null)).toBe('Aug 2025 – Present')
    expect(dateRange('2022-07-01', '2024-06-01')).toBe('Jul 2022 – Jun 2024')
  })

  it('content hash ignores updated_at only', () => {
    const a = fixture()
    expect(cvContentHash(a)).toBe(cvContentHash({ ...a, updated_at: 'later' }))
    expect(cvContentHash(a)).not.toBe(cvContentHash({ ...a, profile: { ...a.profile, cv_headline: 'Other' } }))
  })
})
