import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CvSheets, metadata } from '../cv/page'

const cv = {
  experience: [
    { id: 1, position: 'Software Developer', company: 'Cintra HR & Payrolls', start_date: '2025-08-01', end_date: null, location: 'Newcastle, UK · Remote', achievements: ['Built the library.'] },
    { id: 2, position: 'Software Developer', company: 'PASS Ltd', start_date: '2024-06-01', end_date: '2024-08-01', achievements: [] },
  ],
  skills: [{ category: 'Frontend', items: [{ id: 1, name: 'Angular' }, { id: 2, name: 'React' }] }],
  projects: [1, 2, 3, 4].map((n) => ({ id: n, slug: `p${n}`, title: `Project ${n}`, description: 'd', technologies: ['Electron', 'Next.js'] })),
  education: [{ id: 1, degree: 'BSc', field_of_study: 'Computer Science', institution: 'Teesside University', start_date: '2016-09-01', end_date: '2020-06-01' }],
  learning: [{ id: 1, title: 'Bootcamp', provider: 'Udemy', status: 'in_progress' }],
  certifications: [],
  profile: {
    cv_headline: 'Full-stack Software Engineer',
    cv_profile: 'Profile text from the API.',
    cv_ai_workflow: 'AI-assisted, never AI-driven.',
    contact: { email: 'demi.21@outlook.com', linkedin_url: 'https://www.linkedin.com/in/x', github_url: 'https://github.com/DemiInfinity', portfolio_url: 'https://www.demitaylornimmo.com', location: 'UK · Remote' },
  },
  recommendation: { id: 1, quote: 'Warmth to the team.', name: 'Adam Mellor', role: 'Team lead', company: '3T Global' },
}

const h2s = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

describe('CV', () => {
  it('renders the sections in order with API prose', () => {
    render(<CvSheets cv={cv as any} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Demi Taylor Nimmo')
    expect(h2s()).toEqual(['Profile', 'Experience', 'Skills', 'AI-assisted workflow', 'Selected projects', 'Education', 'Currently learning', 'Recommendation'])
    expect(screen.getByText('Profile text from the API.')).toBeInTheDocument()
    expect(screen.getByText('Software Developer · Cintra HR & Payrolls')).toBeInTheDocument()
    expect(screen.getByText('Aug 2025 – Present')).toBeInTheDocument()
    expect(screen.getByText('Jun 2024 – Aug 2024')).toBeInTheDocument()
    expect(screen.getByText('Angular, React')).toBeInTheDocument()
    expect(screen.queryByText('Project 4')).not.toBeInTheDocument()
    expect(screen.getByText('Bootcamp (Udemy)')).toBeInTheDocument()
    expect(screen.getByText('Adam Mellor, Team lead at 3T Global')).toBeInTheDocument()
    expect(document.body.textContent).toContain('Phone available on request')
    expect(document.body.textContent).not.toMatch(/\+?\d[\d\s]{9,}/)
  })

  it('adds Certifications only when present and drops empty sections', () => {
    render(
      <CvSheets
        cv={{ ...cv, certifications: [{ id: 1, name: 'AWS', issuer: 'Amazon', issue_date: '2024-01-01' }], recommendation: null, profile: { ...cv.profile, cv_ai_workflow: '' } } as any}
      />
    )
    expect(h2s()).toEqual(['Profile', 'Experience', 'Skills', 'Selected projects', 'Education', 'Certifications', 'Currently learning'])
    expect(screen.getByText('AWS, Amazon, 2024')).toBeInTheDocument()
  })

  it('is noindex', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

describe('CV styles stay scoped (QA B-1)', () => {
  it('no design.css rule targets a class the CV renders, apart from the shared serif utility', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(__dirname, '../design.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const designClasses = new Set(Array.from(css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g), (m) => m[1]))
    const { container } = render(<CvSheets cv={cv as any} />)
    const cvClasses = new Set(
      Array.from(container.querySelectorAll('[class]')).flatMap((el) => String(el.getAttribute('class')).split(/\s+/))
    )
    const shared = Array.from(cvClasses).filter((c) => designClasses.has(c) && c !== 'serif')
    expect(shared).toEqual([])
  })
})
