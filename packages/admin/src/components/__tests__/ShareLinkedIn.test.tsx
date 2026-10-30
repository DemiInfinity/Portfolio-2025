import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Blog from '@/pages/Blog'
import Projects from '@/pages/Projects'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const POSTS = [
  { id: 1, title: 'How I Built Automatic Updates', slug: 'automatic-updates-desktop-app', excerpt: 'Updates that just work.', category: 'Desktop', read_time: 3, publish_date: '2026-04-01', tags: ['Velopack', 'C# / .NET'], featured: false, published: true, cover_image: 'https://x/cover.jpg' },
  { id: 2, title: 'Designing a CV that rebuilds itself', slug: 'cv', excerpt: '', category: '', read_time: 1, publish_date: '2026-05-01', tags: [], featured: false, published: false, cover_image: null },
]
const PROJECTS = [
  { id: 1, title: 'LunaLore', slug: 'lunalore', status: 'in_development', show_on_site: true, featured: true, technologies: ['Next.js', 'Supabase'], images: [], description: 'Lore for VTubers.', image: '' },
  { id: 2, title: 'Hidden One', slug: 'hidden', status: 'completed', show_on_site: false, featured: false, technologies: [], images: [] },
  { id: 3, title: 'Big Idea', slug: 'idea', status: 'ideas', show_on_site: true, featured: false, technologies: [], images: [] },
]

const toast = () => document.querySelector('.toast')
const writeText = vi.fn()

describe('Share on LinkedIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: { success: true, data: url.startsWith('/blog') ? POSTS : PROJECTS } }) as never)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    writeText.mockResolvedValue(undefined)
    vi.spyOn(window, 'open').mockReturnValue(null)
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows Share only on published posts', async () => {
    renderApp(<Blog />)
    expect(await screen.findByRole('button', { name: 'Share How I Built Automatic Updates on LinkedIn' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Share Designing a CV/ })).not.toBeInTheDocument()
  })

  it('shows Share only on projects that are on the site', async () => {
    renderApp(<Projects />)
    expect(await screen.findByRole('button', { name: 'Share LunaLore on LinkedIn' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Share Hidden One/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Share Big Idea/ })).not.toBeInTheDocument()
  })

  it('builds the starter text, switches starters, and shows the preview and URL', async () => {
    const user = userEvent.setup()
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'Share How I Built Automatic Updates on LinkedIn' }))
    const url = 'https://www.demitaylornimmo.com/blog/automatic-updates-desktop-app'
    const box = screen.getByLabelText('Your post')
    expect(box).toHaveValue(`New post: How I Built Automatic Updates\n\nUpdates that just work.\n\nRead it here: ${url}\n\n#Velopack #CNET`)
    expect(within(screen.getByRole('group', { name: 'Starting text' })).getByRole('button', { name: 'New post' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(screen.getByRole('group', { name: 'Starting text' })).getByRole('button', { name: 'Just the link' }))
    expect(box).toHaveValue(`How I Built Automatic Updates\n${url}`)
    const card = screen.getByTestId('li-card')
    expect(card).toHaveTextContent('How I Built Automatic Updates')
    expect(card).toHaveTextContent('demitaylornimmo.com')
    expect(card.querySelector('img')).toHaveAttribute('src', 'https://x/cover.jpg')
    expect(screen.getByText(url)).toBeInTheDocument()
  })

  it('counts characters and turns the counter red over 3,000', async () => {
    const user = userEvent.setup()
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'Share How I Built Automatic Updates on LinkedIn' }))
    fireEvent.change(screen.getByLabelText('Your post'), { target: { value: 'x'.repeat(3000) } })
    expect(screen.getByText('3,000 / 3,000 characters')).not.toHaveClass('over')
    fireEvent.change(screen.getByLabelText('Your post'), { target: { value: 'x'.repeat(3001) } })
    expect(screen.getByText('3,001 / 3,000 characters')).toHaveClass('over')
    expect(within(screen.getByRole('group', { name: 'Starting text' })).getByRole('button', { name: 'New post' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('copies the text and opens LinkedIn with the encoded URL', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderApp(<Projects />)
    await user.click(await screen.findByRole('button', { name: 'Share LunaLore on LinkedIn' }))
    const link = screen.getByRole('link', { name: 'Copy text and open LinkedIn' })
    const share = 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.demitaylornimmo.com%2Fprojects%2Flunalore'
    expect(link).toHaveAttribute('href', share)
    await user.click(link)
    await waitFor(() => expect(window.open).toHaveBeenCalledWith(share, '_blank', 'noopener,noreferrer'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('New project: LunaLore'))
    expect(toast()).toHaveTextContent('Text copied. Paste it into your LinkedIn post.')
  })

  it('Copy text only copies and toasts', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'Share How I Built Automatic Updates on LinkedIn' }))
    await user.click(screen.getByRole('button', { name: 'Copy text only' }))
    await waitFor(() => expect(toast()).toHaveTextContent('Post text copied'))
    expect(window.open).not.toHaveBeenCalled()
  })

  it('selects the text and says so when the clipboard fails, without opening LinkedIn', async () => {
    const user = userEvent.setup()
    const failing = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: failing }, configurable: true })
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'Share How I Built Automatic Updates on LinkedIn' }))
    await user.click(screen.getByRole('link', { name: 'Copy text and open LinkedIn' }))
    await waitFor(() => expect(toast()).toHaveTextContent("Couldn't copy. The text is selected"))
    const box = screen.getByLabelText('Your post') as HTMLTextAreaElement
    expect(box).toHaveFocus()
    expect(box.selectionEnd - box.selectionStart).toBe(box.value.length)
    expect(window.open).not.toHaveBeenCalled()
  })
})
