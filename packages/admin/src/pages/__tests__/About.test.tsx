import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link } from 'react-router-dom'
import About from '../About'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const ABOUT = {
  intro: ['One', 'Two', 'Three'],
  looking_for: { summary: 'Summary', items: [{ label: 'Role', value: 'Full-stack' }, { label: 'Where', value: 'Remote' }, { label: 'When', value: 'Now' }] },
  open_to_work_off_line: 'Happily at Cintra, always up for a chat',
  cv_headline: 'Full-stack developer',
  cv_profile: 'Profile',
  cv_ai_workflow: '',
  contact: { email: 'demi@example.com', linkedin_url: '', github_url: '', portfolio_url: 'https://www.demitaylornimmo.com', location: 'Newcastle' },
  updated_at: null,
}
let recs: object[] = []
let otw = true

const toast = () => document.querySelector('.toast')

describe('About', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recs = [{ id: 1, quote: 'Demi is great', full_text: null, name: 'Adam Mellor', role: 'Lead', company: 'Cintra', relationship: null, source: 'LinkedIn', source_url: null, date: '2025-11-01', show_on_cv: true, sort_order: 0 }]
    otw = true
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/content/about') return { data: { success: true, data: ABOUT } } as never
      if (url === '/recommendations') return { data: { success: true, data: recs } } as never
      return { data: { success: true, data: [{ id: 2, name: 'open_to_work', enabled: otw }] } } as never
    })
    vi.mocked(api.put).mockImplementation(async (_u: string, body: unknown) => ({ data: { success: true, data: { ...(body as object), updated_at: '2026-10-30T10:00:00Z' } } }) as never)
  })

  it('enables Save only when dirty and sends exactly the H-16 keys', async () => {
    const user = userEvent.setup()
    renderApp(<About />, { route: '/about' })
    const save = await screen.findByRole('button', { name: 'Save changes' })
    await screen.findByLabelText('Paragraph 1')
    expect(save).toBeDisabled()
    expect(screen.getByText('The About page and the top of your CV. Not saved from the admin yet.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Paragraph 1'), { target: { value: 'One!' } })
    expect(save).toBeEnabled()
    await user.click(save)
    await waitFor(() => expect(api.put).toHaveBeenCalled())
    const [url, body] = vi.mocked(api.put).mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/content/about')
    expect(Object.keys(body).sort()).toEqual(['contact', 'cv_ai_workflow', 'cv_headline', 'cv_profile', 'intro', 'looking_for', 'open_to_work_off_line'])
    expect(body.intro).toEqual(['One!', 'Two', 'Three'])
    await waitFor(() => expect(toast()).toHaveTextContent('About saved. The CV rebuilds in a few seconds.'))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('caps paragraphs at 6 and confirms removing one with text', async () => {
    const user = userEvent.setup()
    renderApp(<About />, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    const add = screen.getByRole('button', { name: 'Add a paragraph' })
    for (let i = 0; i < 3; i++) await user.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText('Up to 6.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove paragraph 1' }))
    expect(screen.getByRole('alertdialog', { name: 'Remove paragraph 1?' })).toBeInTheDocument()
  })

  it('moves Detail 2 up in the PUT order', async () => {
    const user = userEvent.setup()
    renderApp(<About />, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    await user.click(screen.getByRole('button', { name: 'Move detail 2 up' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalled())
    const body = vi.mocked(api.put).mock.calls[0][1] as { looking_for: { items: { label: string }[] } }
    expect(body.looking_for.items.map((i) => i.label)).toEqual(['Where', 'Role', 'When'])
  })

  it('shows which section is live from the open_to_work flag', async () => {
    renderApp(<About />, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    await waitFor(() => expect(within(screen.getByRole('region', { name: "What I'm looking for" })).getByText('Showing now')).toBeInTheDocument())
    expect(within(screen.getByRole('region', { name: "When you're not looking" })).getByText('Hidden now')).toBeInTheDocument()
  })

  it('maps a 400 detail path to Detail 2 Label and focuses it', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValueOnce({ response: { status: 400, data: { success: false, error: 'Invalid input', details: [{ path: 'looking_for.items[1].label', msg: 'Invalid value' }] } } })
    renderApp(<About />, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Changed' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Invalid value')).toBeInTheDocument()
    const labels = screen.getAllByLabelText('Label')
    await waitFor(() => expect(labels[1]).toHaveFocus())
    expect(labels[1]).toHaveAttribute('aria-invalid', 'true')
    expect(toast()).toHaveTextContent('Check the highlighted fields.')
  })

  it('blocks a 2001-character paragraph', async () => {
    const user = userEvent.setup()
    renderApp(<About />, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    fireEvent.change(screen.getByLabelText('Paragraph 1'), { target: { value: 'x'.repeat(2001) } })
    expect(screen.getByText('Keep this under 2000 characters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(api.put).not.toHaveBeenCalled()
  })

  it('asks before leaving with unsaved changes', async () => {
    const user = userEvent.setup()
    const { router } = renderApp(<><Link to="/projects">Go</Link><About /></>, { route: '/about' })
    await screen.findByLabelText('Paragraph 1')
    fireEvent.change(screen.getByLabelText('Paragraph 1'), { target: { value: 'Edited' } })
    await user.click(screen.getByRole('link', { name: 'Go' }))
    const c = await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
    await user.click(within(c).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.pathname).toBe('/about')
  })

  it('lists recommendations, validates and adds one with the next sort order', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockImplementation(async (_u: string, b: unknown) => {
      recs = [...recs, { id: 2, ...(b as object) }]
      return { data: { success: true, data: { id: 2 } } } as never
    })
    renderApp(<About />, { route: '/about?tab=recommendations' })
    expect(await screen.findByText('Adam Mellor · Lead at Cintra')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Recommendations 1' })).toBeInTheDocument()
    expect(screen.getByText('On the CV')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add recommendation' }))
    const dlg = screen.getByRole('dialog', { name: 'Add recommendation' })
    await user.click(within(dlg).getByRole('button', { name: 'Add recommendation' }))
    expect(screen.getByText('Add the quote.')).toBeInTheDocument()
    expect(screen.getByText('Add who wrote it.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Quote'), { target: { value: 'Brilliant' } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jo Bloggs' } })
    await user.click(within(dlg).getByRole('button', { name: 'Add recommendation' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/recommendations', expect.objectContaining({ quote: 'Brilliant', name: 'Jo Bloggs', show_on_cv: false, sort_order: 10 })))
    expect(await screen.findByRole('tab', { name: 'Recommendations 2' })).toBeInTheDocument()
  })

  it('reorders by swapping sort_order, spreading tied orders first', async () => {
    const user = userEvent.setup()
    recs = [...recs, { id: 2, quote: 'Q', full_text: null, name: 'Jo Bloggs', role: null, company: null, relationship: null, source: null, source_url: null, date: null, show_on_cv: false, sort_order: 0 }]
    vi.mocked(api.put).mockImplementation(async (u: string, b: unknown) => {
      const id = Number(u.split('/').pop())
      recs = (recs as { id: number; sort_order: number }[]).map((r) => (r.id === id ? { ...r, ...(b as object) } : r)).sort((a, z) => a.sort_order - z.sort_order)
      return { data: { success: true } } as never
    })
    renderApp(<About />, { route: '/about?tab=recommendations' })
    await user.click(await screen.findByRole('button', { name: 'Move Jo Bloggs up' }))
    await waitFor(() => expect(document.querySelector('.rows > li.row')).toHaveTextContent('Jo Bloggs'))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/recommendations/2', { sort_order: 0 }))
    expect(api.put).toHaveBeenCalledWith('/recommendations/1', { sort_order: 10 })
  })

  it('names the recommendation in the delete confirm', async () => {
    const user = userEvent.setup()
    renderApp(<About />, { route: '/about?tab=recommendations' })
    await user.click(await screen.findByRole('button', { name: 'Edit recommendation from Adam Mellor' }))
    await user.click(screen.getByRole('button', { name: 'Delete recommendation' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete the recommendation from Adam Mellor?' })).toBeInTheDocument()
  })
})
