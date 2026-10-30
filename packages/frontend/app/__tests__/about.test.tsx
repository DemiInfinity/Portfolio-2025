import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AboutClient, { recommendationRole, recommendationSource } from '../about/about-client'
import { OverlayProvider } from '@/components/overlays/OverlayProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { aboutSeed } from '@/lib/content/site'

vi.mock('next/navigation', () => ({ usePathname: () => '/about', useRouter: () => ({ refresh: vi.fn() }) }))

const about = {
  ...aboutSeed,
  intro: ['First paragraph from the API.', 'Second paragraph from the API.'],
  looking_for: { summary: 'A remote role.', items: [{ label: 'Work style', value: 'Fully remote' }] },
  open_to_work_off_line: 'Happily at Cintra, always up for a chat',
}

const learning = [
  { id: 1, title: 'Bootcamp', status: 'in_progress', progress: 19, provider: 'Udemy', start_date: '2025-04-01', description: 'build full apps' },
  { id: 2, title: 'Designer', status: 'in_progress', progress: 18 },
  { id: 3, title: 'Cypress', status: 'in_progress', progress: 15 },
  { id: 4, title: 'AI Engineer', status: 'in_progress', progress: 1 },
  { id: 5, title: 'Done', status: 'completed', progress: 100 },
]

const rec = (id: number, name: string, extra = {}) => ({ id, quote: `Quote ${id}`, name, role: 'Team lead', company: '3T Global', relationship: 'managed Demi directly', source: 'LinkedIn', date: '2025-01-01', ...extra })

function renderAbout(props: Partial<Parameters<typeof AboutClient>[0]> = {}) {
  return render(
    <ToastProvider>
      <OverlayProvider>
        <AboutClient
          about={about as any}
          openToWork
          recommendations={[rec(1, 'Adam Mellor', { full_text: 'I had the pleasure of working with Demi.' })] as any}
          learning={learning as any}
          skills={[{ id: 1, name: 'TypeScript', level: 'advanced', description: '4 years' }, { id: 2, name: 'Go', level: 'beginner' }] as any}
          posts={[{ id: 1, slug: 'a', title: 'Post A', category: 'Desktop', publish_date: '2026-04-01' }, { id: 2, slug: 'b', title: 'Post B' }] as any}
          certifications={[]}
          {...props}
        />
      </OverlayProvider>
    </ToastProvider>
  )
}

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, available: false, url: null }) })) as any
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any
})

describe('About', () => {
  it('renders the intro from the API and the looking-for panel when open to work', () => {
    renderAbout()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('About me')
    expect(screen.getByText('First paragraph from the API.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What I’m looking for/ })).toBeInTheDocument()
    expect(screen.getByText('Work style')).toBeInTheDocument()
    expect(screen.getByText('Fully remote')).toBeInTheDocument()
  })

  it('shows the soft line instead when open_to_work is off', () => {
    renderAbout({ openToWork: false })
    expect(screen.queryByRole('heading', { name: /looking for/ })).not.toBeInTheDocument()
    expect(screen.getByText('Happily at Cintra, always up for a chat')).toBeInTheDocument()
  })

  it('lists up to 4 in-progress courses and opens the learning modal', async () => {
    renderAbout()
    const rows = document.querySelectorAll('.learn')
    expect(rows).toHaveLength(4)
    expect(rows[3]).toHaveTextContent('Just started')
    expect((rows[0].querySelector('.bar') as HTMLElement).style.width).toBe('19%')
    await userEvent.click(screen.getByRole('button', { name: 'See all courses' }))
    const dialog = screen.getByRole('dialog', { name: 'My learning journey' })
    expect(dialog).toHaveTextContent('4 courses in progress · 1 skills mastered · 4 goals ahead')
    expect(within(dialog).getByText('Udemy · Started April 2025')).toBeInTheDocument()
    expect(within(dialog).getByText('Goal: build full apps')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles the full recommendation', async () => {
    renderAbout()
    const toggle = screen.getByRole('button', { name: 'Read the full recommendation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('I had the pleasure of working with Demi.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('switches between recommendations and hides the section when there are none', async () => {
    const { unmount } = renderAbout({ recommendations: [rec(1, 'Adam Mellor'), rec(2, 'Second Person')] as any })
    expect(screen.queryByRole('button', { name: 'Read the full recommendation' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Second Person')).toBeInTheDocument()
    unmount()
    renderAbout({ recommendations: [] })
    expect(screen.queryByRole('heading', { name: /Kind words/ })).not.toBeInTheDocument()
  })

  it('shows latest writing and certifications only when present', () => {
    const { unmount } = renderAbout()
    expect(screen.getByRole('link', { name: /Post A/ })).toHaveAttribute('href', '/blog/a')
    expect(screen.getByText('Desktop · 1 April 2026')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Certifications' })).not.toBeInTheDocument()
    unmount()
    renderAbout({ certifications: [{ id: 1, name: 'AWS Cloud Practitioner', issuer: 'AWS', issue_date: '2024-05-01' }] as any })
    expect(screen.getByText('AWS Cloud Practitioner')).toBeInTheDocument()
  })

  it('still renders when sections failed to load', () => {
    renderAbout({ learning: null, recommendations: null, posts: null, skills: null, certifications: null })
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('shows the whole code text at once under reduced motion', () => {
    renderAbout()
    expect(screen.getByLabelText(/Code describing Demi/)).toHaveTextContent('export default demi;')
  })

  it('formats recommendation captions', () => {
    expect(recommendationRole(rec(1, 'A') as any)).toBe('Team lead at 3T Global · managed Demi directly')
    expect(recommendationSource(rec(1, 'A') as any)).toBe('LinkedIn recommendation, January 2025')
    expect(recommendationRole({ id: 1, quote: 'q', name: 'n' })).toBe('')
  })
})
