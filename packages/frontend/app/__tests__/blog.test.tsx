import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BlogClient from '../blog/(list)/blog-client'
import BlogPostClient, { sparkleKey } from '../blog/[slug]/BlogPostClient'
import { ToastProvider } from '@/components/ui/Toast'
import { saveConsent, resetConsentMemory } from '@/lib/consent'

vi.mock('next/navigation', () => ({ usePathname: () => '/blog' }))

const post = (slug: string, category: string, extra = {}) => ({
  id: slug.length,
  slug,
  title: `Title ${slug}`,
  excerpt: `Excerpt ${slug}`,
  category,
  read_time: 3,
  publish_date: '2026-04-01T00:00:00Z',
  featured: false,
  ...extra,
})

const posts = [post('desk', 'Desktop', { featured: true }), post('back', 'Backend'), post('f1', 'Frontend'), post('f2', 'Frontend')]

describe('Blog', () => {
  it('shows filter chips with counts', () => {
    render(<BlogClient posts={posts as any} />)
    const group = screen.getByRole('group', { name: 'Filter posts by topic' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['All 4', 'Desktop 1', 'Backend 1', 'Frontend 2'])
  })

  it('All: featured card then More posts', () => {
    render(<BlogClient posts={posts as any} />)
    expect(screen.getByRole('link', { name: 'Featured post: Title desk' })).toHaveAttribute('href', '/blog/desk')
    expect(screen.getByRole('heading', { name: 'More posts' })).toBeInTheDocument()
    expect(document.querySelectorAll('.blog-grid > a')).toHaveLength(3)
    expect(screen.getAllByText('1 April 2026').length).toBeGreaterThan(0)
  })

  it('a category hides the featured card', async () => {
    render(<BlogClient posts={posts as any} />)
    const chip = screen.getByRole('button', { name: 'Frontend 2' })
    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('link', { name: /Featured post/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Frontend posts' })).toBeInTheDocument()
    expect(document.querySelectorAll('.blog-grid > a')).toHaveLength(2)
  })

  it('shows an empty state', () => {
    render(<BlogClient posts={[]} />)
    expect(screen.getByText('The first post is on its way.')).toBeInTheDocument()
  })
})

describe('Blog post', () => {
  const full = post('stop-thinking', 'Frontend', {
    author: null,
    read_time: 10,
    publish_date: '2026-01-07',
    tags: ['Components'],
    content: '> A quote\n\n```ts\nconst a = 1\n```\n\n## Heading',
  })

  beforeEach(() => {
    window.localStorage.clear()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    global.fetch = vi.fn()
  })

  function renderPost() {
    return render(
      <ToastProvider>
        <BlogPostClient post={full as any} url="https://demitaylornimmo.com/blog/stop-thinking" keepReading={[post('f2', 'Frontend')] as any} />
      </ToastProvider>
    )
  }

  it('renders the header, markdown and keep reading without fetching', () => {
    renderPost()
    expect(screen.getByRole('heading', { level: 1, name: 'Title stop-thinking' })).toBeInTheDocument()
    expect(screen.getByText('10 min read · 7 January 2026')).toBeInTheDocument()
    expect(screen.getByText('Demi Taylor Nimmo')).toBeInTheDocument()
    expect(screen.getByText('A quote').closest('blockquote')).not.toBeNull()
    expect(document.querySelector('pre code')).toHaveTextContent('const a = 1')
    expect(screen.getByRole('link', { name: /Title f2/ })).toHaveAttribute('href', '/blog/f2')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('copies the link and shows the toast', async () => {
    renderPost()
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://demitaylornimmo.com/blog/stop-thinking')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Link copied to your clipboard'))
  })

  it('remembers the sparkle per slug (with preference consent)', async () => {
    saveConsent({ analytics: false, prefs: true })
    const { unmount } = renderPost()
    await userEvent.click(screen.getByRole('button', { name: 'Send a sparkle' }))
    expect(screen.getByRole('button', { name: 'Sparkle sent' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem(sparkleKey('stop-thinking'))).toBe('1')
    unmount()
    renderPost()
    expect(await screen.findByRole('button', { name: 'Sparkle sent' })).toHaveAttribute('aria-pressed', 'true')
    resetConsentMemory()
  })

  it('without preference consent the sparkle works for the visit but is not stored', async () => {
    resetConsentMemory()
    renderPost()
    await userEvent.click(screen.getByRole('button', { name: 'Send a sparkle' }))
    expect(screen.getByRole('button', { name: 'Sparkle sent' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem(sparkleKey('stop-thinking'))).toBeNull()
  })
})
