import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import HomeClient from '../(home)/home-client'
import ProjectsClient from '../projects/(list)/projects-client'
import ProjectDetailsClient from '../projects/project-details-client'
import ExperienceClient from '../experience/experience-client'
import { OverlayProvider } from '@/components/overlays/OverlayProvider'
import { ToastProvider } from '@/components/ui/Toast'

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

function wrap(ui: ReactNode) {
  return render(
    <ToastProvider>
      <OverlayProvider>{ui}</OverlayProvider>
    </ToastProvider>
  )
}

function mockApi(responses: Record<string, unknown>) {
  global.fetch = vi.fn(async (url: string) => {
    const key = Object.keys(responses).find((k) => String(url).includes(k))
    return { ok: true, status: 200, json: async () => (key ? responses[key] : {}) } as Response
  }) as unknown as typeof fetch
}

const project = (id: number, slug: string, extra = {}) => ({ id, slug, title: `Project ${slug}`, description: `About ${slug}`, image: '/x.png', technologies: ['Next.js', 'Supabase'], ...extra })

beforeEach(() => {
  mockApi({ 'open_to_work': { success: true, enabled: false }, 'upload/resume': { success: true, available: false, url: null } })
  document.body.removeAttribute('style')
})

describe('Home', () => {
  it('renders the hero heading and work cards linking to case studies', () => {
    wrap(<HomeClient projects={[project(1, 'luna'), project(2, 'inf')] as any} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent?.replace(/\s+/g, ' ').trim()).toBe('Hi, I’m Demi Taylor Nimmo')
    expect(screen.getByRole('link', { name: /Project luna/ })).toHaveAttribute('href', '/projects/luna')
    expect(screen.getByRole('img', { name: /interface, API and database/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'demi.21@outlook.com' })).toHaveAttribute('href', 'mailto:demi.21@outlook.com')
  })

  it('shows Open to work and Download CV when the API says so', async () => {
    mockApi({
      'open_to_work': { success: true, enabled: true },
      'upload/resume': { success: true, available: true, url: 'https://x/cv.pdf?v=1' },
    })
    wrap(<HomeClient projects={[]} />)
    expect(await screen.findByText('Open to work')).toBeInTheDocument()
    const cv = await screen.findByRole('link', { name: 'Download CV' })
    expect(cv).toHaveAttribute('href', 'https://x/cv.pdf?v=1')
    expect(cv).toHaveAttribute('download')
  })

  it('switches the colourway on the page only while Home is mounted (show_colourways on)', async () => {
    const { unmount } = wrap(<HomeClient projects={[]} showColourways />)
    await userEvent.click(screen.getByRole('button', { name: 'Rose' }))
    expect(screen.getByRole('button', { name: 'Rose' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Colourway: Rose')).toBeInTheDocument()
    expect(document.body.style.getPropertyValue('--b1')).toBe('#d6336c')
    unmount()
    expect(document.body.style.getPropertyValue('--b1')).toBe('')
  })

  it('keeps the oversized, rotated marquee band inside a horizontal clip (F-10 AC3)', () => {
    const { container } = wrap(<HomeClient projects={[]} />)
    const track = container.querySelector('.marquee')!
    const band = track.parentElement!
    expect(band.style.margin).toBe('-10px -20px 0px')
    expect(band.parentElement).toHaveClass('marquee-clip')
    const css = readFileSync(join(__dirname, '../design.css'), 'utf8')
    expect(css).toMatch(/\.marquee-clip\s*\{[^}]*overflow-x:\s*clip/)
  })

  it('show_colourways off: no switcher, Lilac, and a remembered colourway is ignored', () => {
    window.localStorage.setItem('home_colourway', 'Rose')
    wrap(<HomeClient projects={[]} showColourways={false} />)
    expect(screen.queryByText(/Colourway:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rose' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Colourway/ })).not.toBeInTheDocument()
    expect(document.body.style.getPropertyValue('--b1')).toBe('')
    window.localStorage.removeItem('home_colourway')
  })

  it('show_colourways missing (prop not passed): treated as off', () => {
    window.localStorage.setItem('home_colourway', 'Moonlight')
    wrap(<HomeClient projects={[]} />)
    expect(screen.queryByText(/Colourway:/)).not.toBeInTheDocument()
    expect(document.body.style.getPropertyValue('--b1')).toBe('')
    window.localStorage.removeItem('home_colourway')
  })

  it('show_colourways on: a remembered colourway is restored', async () => {
    window.localStorage.setItem('home_colourway', 'Rose')
    wrap(<HomeClient projects={[]} showColourways />)
    expect(await screen.findByText('Colourway: Rose')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rose' })).toHaveAttribute('aria-pressed', 'true')
    window.localStorage.removeItem('home_colourway')
  })

  it('shows Retry when projects are unavailable', () => {
    wrap(<HomeClient projects={[]} projectsUnavailable />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

describe('Projects', () => {
  it('renders one section per project with case study links and the H-22 checklist', () => {
    wrap(
      <ProjectsClient
        projects={[
          project(1, 'a'),
          project(2, 'b', { feature_titles: ['Kanban boards and backlog', 'Markdown docs'] }),
          project(3, 'c', { feature_titles: [] }),
        ] as any}
      />
    )
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings.slice(0, 3)).toEqual(['Project a', 'Project b', 'Project c'])
    const links = screen.getAllByRole('link', { name: 'Read the case study' }).map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/projects/a', '/projects/b', '/projects/c'])
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Kanban boards and backlog', 'Markdown docs'])
  })

  it('shows an empty message and Let’s talk opens contact', async () => {
    wrap(<ProjectsClient projects={[]} />)
    expect(screen.getByText(/New projects are on the way/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Let’s talk' }))
    expect(screen.getByRole('dialog', { name: 'Let’s build something' })).toBeInTheDocument()
  })
})

describe('Case study', () => {
  const base = project(1, 'lunalore', { title: 'LunaLore', technologies: ['Electron', 'Next.js'], date: '2025-03-01' })

  it('renders hero meta without missing items and only filled sections', async () => {
    render(
      <ProjectDetailsClient
        project={{
          ...base,
          role: null,
          case_study: {
            overview: 'Overview text',
            problem: 'Problem text',
            how_might_we: 'How might a creator keep it all in one place?',
            process: [1, 2, 3, 4].map((n) => ({ label: `Phase ${n}`, title: `Title ${n}`, body: `Body ${n}` })),
            challenges: [{ title: 'One codebase', solution: 'Shared the app' }],
            metrics: [{ value: '30%', label: 'lower costs' }, { value: '2', label: 'platforms' }, { value: '1', label: 'codebase' }],
          },
        } as any}
        next={{ ...project(2, 'inf'), title: 'Infinity Tracker' } as any}
      />
    )
    expect(screen.getByRole('heading', { level: 1, name: 'LunaLore' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← All projects' })).toHaveAttribute('href', '/projects')
    expect(screen.queryByText('Role')).not.toBeInTheDocument()
    expect(screen.getByText('Electron, Next.js')).toBeInTheDocument()
    expect(screen.getByText('March 2025')).toBeInTheDocument()

    const toc = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(toc).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#overview', '#problem', '#process', '#challenges', '#outcome'])
    expect(screen.queryByRole('heading', { name: 'Architecture' })).not.toBeInTheDocument()

    expect(screen.getByText('How might a creator keep it all in one place?').closest('blockquote')).not.toBeNull()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByText('Title 3')).toBeInTheDocument()
    tabs[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()

    expect(screen.getByText('Solution:')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Next project/ })).toHaveAttribute('href', '/projects/inf')
  })

  it('falls back to legacy Markdown content with a TOC', () => {
    render(<ProjectDetailsClient project={{ ...base, case_study: null, content: '## Overview\ntext' } as any} />)
    expect(document.getElementById('overview')).not.toBeNull()
    expect(within(screen.getByRole('navigation', { name: 'On this page' })).getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview')
  })
})

describe('Experience', () => {
  const roles = [
    { id: 1, position: 'Software Developer', company: 'Cintra', start_date: '2025-08-01', end_date: null, achievements: ['Built it'], highlights: [], technologies: ['Angular'] },
    { id: 2, position: 'Developer', company: 'PASS Ltd', start_date: '2024-06-01', end_date: '2024-08-01', achievements: [], highlights: ['−80% manual update effort'], technologies: [] },
  ]
  const education = [{ id: 1, degree: 'BSc', field_of_study: 'Computer Science', institution: 'Teesside University', start_date: '2016-09-01', end_date: '2020-06-01' }]

  it('lists roles with Current, dates, pills and the education band', async () => {
    wrap(<ExperienceClient roles={roles as any} education={education as any} />)
    const ol = document.querySelector('ol')!
    expect(ol.querySelectorAll(':scope > li')).toHaveLength(2)
    const items = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(items).toEqual(['Software Developer', 'Developer'])
    expect(screen.getAllByText('Current')).toHaveLength(1)
    expect(screen.getByText('Aug 2025 – now')).toBeInTheDocument()
    expect(screen.getByText('Jun – Aug 2024')).toBeInTheDocument()
    expect(screen.getByText('−80% manual update effort')).toBeInTheDocument()
    expect(screen.getByText('BSc Computer Science')).toBeInTheDocument()
    expect(screen.getByText('Teesside University, 2016 – 2020')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Get in touch' }))
    expect(screen.getByRole('dialog', { name: 'Let’s build something' })).toBeInTheDocument()
  })
})
