import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Blog from '../Blog'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const P = (id: number, title: string, cat: string, mins: number, date: string, tags: string[], featured = false) => ({
  id, title, slug: 's' + id, excerpt: 'e', content: '# ' + title, author: 'Demi Taylor Nimmo', publish_date: date, read_time: mins, category: cat, tags, featured, published: true, cover_image: null,
})
const POSTS = [
  P(1, 'How I Built Automatic Updates Into a Desktop App (Without the Headache)', 'Desktop', 3, '2026-04-01T00:00:00Z', ['Velopack', 'C#'], true),
  P(2, 'Connecting Micro-Frontends to Serverless Backends: Patterns That Actually Work', 'Backend', 12, '2026-01-23T00:00:00Z', ['Micro-frontends']),
  P(3, 'Stop Thinking in Pages. Start Thinking in Components.', 'Frontend', 10, '2026-01-07T00:00:00Z', []),
  P(4, 'The Reality of Micro Frontend Adoption', 'Frontend', 5, '2025-09-20T00:00:00Z', ['Architecture']),
]

describe('Blog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: POSTS } })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 9, unfeatured: [] } } })
  })

  it('shows the sub line, the search and the drafts empty state', async () => {
    const user = userEvent.setup()
    renderApp(<Blog />)
    expect(await screen.findByText('4 published, 0 drafts. Latest: 1 Apr 2026.')).toBeInTheDocument()
    expect(screen.getByText('Desktop · 3 min read · Velopack, C#')).toBeInTheDocument()
    expect(screen.getByText('Frontend · 10 min read · no tags')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search posts'), 'velopack')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    await user.clear(screen.getByLabelText('Search posts'))
    await user.click(screen.getByRole('button', { name: 'Drafts 0' }))
    expect(screen.getByText('No drafts. Every post is live.')).toBeInTheDocument()
  })

  it('counts words, previews Markdown as headings, and follows the Published switch', async () => {
    const user = userEvent.setup()
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'New post' }))
    const dlg = screen.getByRole('dialog', { name: 'New post' })
    expect(within(dlg).getByText('Draft. Only you can see it.')).toBeInTheDocument()
    expect(within(dlg).getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Post content in Markdown'), { target: { value: Array(440).fill('word').join(' ') } })
    expect(screen.getByText('440 words · about 2 min read')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Post content in Markdown'), { target: { value: '# Heading\n\nBody' } })
    await user.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument()
    expect(screen.queryByText('# Heading')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Published' }))
    expect(within(dlg).getByRole('button', { name: 'Publish post' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Published' }))
    expect(within(dlg).getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
  })

  it('publishing requires excerpt, content and category; a draft only needs a title', async () => {
    const user = userEvent.setup()
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'New post' }))
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(screen.getByText('Give the post a title.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'Hello: world')
    expect(screen.getByLabelText('URL slug')).toHaveValue('hello-world')
    await user.click(screen.getByRole('switch', { name: 'Published' }))
    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect(screen.getByText('Add an excerpt.')).toBeInTheDocument()
    expect(screen.getByText('Write the post before publishing.')).toBeInTheDocument()
    expect(screen.getByText('Add a category.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Short' } })
    fireEvent.change(screen.getByLabelText('Post content in Markdown'), { target: { value: 'Body' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Frontend' } })
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'a, b ,' } })
    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/blog', expect.objectContaining({ tags: ['a', 'b'], published: true, slug: 'hello-world' })))
    expect(await screen.findByRole('status')).toHaveTextContent('Published “Hello”')
  })

  it('opens the new-post dialog from ?new=1', async () => {
    renderApp(<Blog />, { route: '/blog?new=1' })
    expect(await screen.findByRole('dialog', { name: 'New post' })).toBeInTheDocument()
  })

  it('names the post in the delete confirm and toasts after DELETE', async () => {
    const user = userEvent.setup()
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })
    renderApp(<Blog />)
    await user.click(await screen.findByRole('button', { name: 'Edit Stop Thinking in Pages. Start Thinking in Components.' }))
    await user.click(screen.getByRole('button', { name: 'Delete post' }))
    const c = screen.getByRole('alertdialog', { name: 'Delete this post?' })
    expect(c).toHaveTextContent('“Stop Thinking in Pages. Start Thinking in Components.” comes off the blog')
    await user.click(within(c).getByRole('button', { name: 'Delete post' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/blog/3'))
    expect(await screen.findByRole('status')).toHaveTextContent('Post deleted')
  })
})
