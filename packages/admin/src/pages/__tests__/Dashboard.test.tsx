import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../Dashboard'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const DATA: Record<string, unknown> = {
  '/projects/admin/all': [
    { id: 1, title: 'LunaLore', featured: true, technologies: [], images: [] },
    { id: 2, title: 'Infinity Tracker', featured: false, technologies: [], images: [] },
    { id: 3, title: 'This portfolio', featured: false, technologies: [], images: [] },
  ],
  '/blog/admin/all': [
    { id: 1, title: 'How I Built Automatic Updates Into a Desktop App (Without the Headache)', category: 'Desktop', read_time: 3, publish_date: '2026-04-01T00:00:00Z', published: true, tags: [] },
    { id: 2, title: 'Connecting Micro-Frontends', category: 'Backend', read_time: 12, publish_date: '2026-01-23T00:00:00Z', published: true, tags: [] },
    { id: 3, title: 'Stop Thinking in Pages', category: 'Frontend', read_time: 10, publish_date: '2026-01-07T00:00:00Z', published: true, tags: [] },
    { id: 4, title: 'The Reality of Micro Frontend Adoption', category: 'Frontend', read_time: 5, publish_date: '2025-09-20T00:00:00Z', published: true, tags: [] },
  ],
  '/work-history': [
    { id: 1, company: 'Cintra HR & Payrolls', position: 'Software Developer', start_date: '2025-08-01', end_date: null },
    { id: 2, company: 'PASS Ltd', position: 'Software Developer', start_date: '2024-06-01', end_date: '2024-08-01' },
    { id: 3, company: '3T Global', position: 'Mid', start_date: '2022-07-01', end_date: '2024-06-01' },
    { id: 4, company: '3T Global', position: 'Junior', start_date: '2021-02-01', end_date: '2022-07-01' },
  ],
  '/education': [{ id: 1, institution: 'Teesside University', degree: 'BSc' }],
  '/certifications': [],
  '/learning': [
    { id: 1, title: 'The Complete Full-Stack Web Development Bootcamp', progress: 19, status: 'in_progress' },
    { id: 2, title: 'Complete Web & Mobile Designer', progress: 18, status: 'in_progress' },
    { id: 3, title: 'The Complete Cypress v13 Course: Automation Testing Bootcamp', progress: 15, status: 'in_progress', estimated_completion: '2025-12-01' },
    { id: 4, title: 'The AI Engineer Course 2025', progress: 1, status: 'in_progress' },
  ],
  '/skills': [{ id: 1, name: 'TypeScript', level: 'advanced' }, { id: 2, name: 'C#', level: 'advanced' }],
  '/feature-flags': [
    { id: 1, name: 'maintenance_mode', enabled: false },
    { id: 2, name: 'open_to_work', enabled: true },
    { id: 3, name: 'show_marbl', enabled: false },
  ],
  '/cv/status': { state: 'idle', generatedAt: null, error: null, pdfUrl: null, size: null },
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 9))
    vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: { success: true, data: DATA[url] } }) as never)
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } })
  })
  afterEach(() => vi.useRealTimers())

  it('shows the KPIs, Needs attention in order and the finding', async () => {
    renderApp(<Dashboard />)
    expect(await screen.findByText('1 course is past its target and no CV PDF is built yet, so the Download CV button is hidden.')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/projects/admin/all')
    for (const c of ['1 featured on the home page', '4 published, latest 1 Apr 2026', 'Current: Cintra HR & Payrolls', '13% average progress', 'None listed yet']) {
      expect(screen.getByText(c)).toBeInTheDocument()
    }
    const todo = within(screen.getByRole('region', { name: /Needs attention/ }))
    expect(todo.getAllByRole('listitem').map((li) => li.querySelector('.r1')!.textContent)).toEqual([
      'The Complete Cypress v13 Course passed its target',
      'No CV PDF yet',
      'No certifications listed',
      'Last post was 209 days ago',
    ])
    expect(screen.getByRole('heading', { name: 'Needs attention 4' })).toBeInTheDocument()
    expect(todo.getByRole('link', { name: 'Build the CV' })).toHaveAttribute('href', '/settings')
    for (const l of screen.getAllByRole('link', { name: 'Write a post' })) expect(l).toHaveAttribute('href', '/blog?new=1')
    expect(screen.getByTestId('cv-pdf')).toHaveTextContent('Not built yet')
  })

  it('toggles Open to work and asks before maintenance', async () => {
    const user = userEvent.setup()
    renderApp(<Dashboard />)
    await user.click(await screen.findByRole('switch', { name: 'Open to work badge' }))
    expect(api.put).toHaveBeenCalledWith('/feature-flags/2', { enabled: false })
    await waitFor(() => expect(document.querySelector('.toast')).toHaveTextContent('Open to work badge off'))
    await user.click(screen.getByRole('switch', { name: 'Maintenance mode' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(api.put).toHaveBeenCalledTimes(1)
  })

  it('Regenerate CV shows Rebuilding, then Rebuilt and toasts', async () => {
    const user = userEvent.setup()
    let resolve!: (v: unknown) => void
    vi.mocked(api.post).mockImplementation(() => new Promise((r) => { resolve = r }))
    renderApp(<Dashboard />)
    await screen.findByText('Not built yet')
    await user.click(screen.getByRole('button', { name: 'Regenerate CV' }))
    expect(api.post).toHaveBeenCalledWith('/cv/regenerate')
    expect(screen.getByTestId('cv-pdf')).toHaveTextContent('Rebuilding')
    const done = { state: 'idle', generatedAt: new Date(2026, 9, 27, 9, 41).toISOString(), error: null, pdfUrl: 'https://x/cv.pdf', size: 188416 }
    DATA['/cv/status'] = done
    resolve({ data: { success: true, data: done } })
    await waitFor(() => expect(screen.getByTestId('cv-pdf')).toHaveTextContent('Rebuilt 09:41'))
    expect(document.querySelector('.toast')).toHaveTextContent('CV rebuilt')
    DATA['/cv/status'] = { state: 'idle', generatedAt: null, error: null, pdfUrl: null, size: null }
  })
})
