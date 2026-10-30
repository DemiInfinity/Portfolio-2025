import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Messages from '../Messages'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'
import { expiresOn, replyHref, snippet } from '@/lib/messages'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const ITEMS = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', kind: 'role', source_path: '/about', created_at: '2026-10-29T16:42:00', read: false, email_status: 'skipped', message: 'Hello Demi,\n\nWe have a role for you.' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', kind: 'freelance', source_path: '/projects/lunalore', created_at: '2026-10-27T09:15:00', read: true, email_status: 'sent', message: 'A freelance enquiry' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com', kind: 'hi', source_path: '/', created_at: '2026-10-20T19:03:00', read: true, email_status: 'failed', message: 'Just saying hi' },
]
let items: typeof ITEMS = []
const toast = () => document.querySelector('.toast')

describe('messages helpers', () => {
  it('builds the reply link, the snippet and the 12-month expiry', () => {
    expect(replyHref('ada@example.com')).toBe('mailto:ada@example.com?subject=Re%3A%20your%20message%20on%20demitaylornimmo.com')
    expect(snippet('\n  First line\nSecond')).toBe('First line')
    expect(expiresOn('2026-10-29T16:42:00')).toBe('on 29 Oct 2027')
  })
})

describe('Messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    items = ITEMS.map((m) => ({ ...m }))
    vi.mocked(api.get).mockImplementation(async () => ({ data: { success: true, data: items, unread: items.filter((m) => !m.read).length } }) as never)
    vi.mocked(api.patch).mockImplementation(async (url: string, body: unknown) => {
      const id = Number(url.split('/').pop())
      items = items.map((m) => (m.id === id ? { ...m, ...(body as object) } : m))
      return { data: { success: true, data: items.find((m) => m.id === id) } } as never
    })
    vi.mocked(api.delete).mockImplementation(async (url: string) => {
      const id = Number(url.split('/').pop())
      items = items.filter((m) => m.id !== id)
      return { status: 204, data: '' } as never
    })
  })

  it('lists messages newest first with unread state, kind and snippet, and the sub line', async () => {
    renderApp(<Messages />)
    expect(await screen.findByText('3 messages from the Hire me form, 1 unread.')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/contact', { params: { limit: 100 } })
    const rows = within(screen.getByRole('region', { name: 'Message list' })).getAllByRole('button')
    expect(rows[0]).toHaveTextContent('Ada Lovelace')
    expect(rows[0]).toHaveTextContent('A full-time role')
    expect(rows[0]).toHaveTextContent('Hello Demi,')
    expect(rows[0]).toHaveTextContent('Unread')
    expect(rows[0].querySelector('.ib-dot')).not.toHaveClass('read')
    expect(screen.getByText('Choose a message to read it.')).toBeInTheDocument()
  })

  it('opening marks it read and shows the reader', async () => {
    const user = userEvent.setup()
    renderApp(<Messages />)
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    expect(api.patch).toHaveBeenCalledWith('/contact/1', { read: true })
    const reader = screen.getByRole('region', { name: 'Ada Lovelace' })
    expect(within(reader).getByRole('link', { name: 'ada@example.com' })).toHaveAttribute('href', 'mailto:ada@example.com')
    expect(reader).toHaveTextContent('29 Oct 2026, 16:42')
    expect(reader).toHaveTextContent('Sent from /about')
    expect(reader).toHaveTextContent('Not emailed (email not set up)')
    expect(screen.getByTestId('ib-body').textContent).toBe('Hello Demi,\n\nWe have a role for you.')
    expect(reader).toHaveTextContent('(on 29 Oct 2027)')
    expect(within(reader).getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', replyHref('ada@example.com'))
    expect(await screen.findByText('3 messages from the Hire me form, 0 unread.')).toBeInTheDocument()
    expect(within(reader).getByRole('button', { name: '← All messages' })).toBeInTheDocument()
  })

  it('Mark as unread sends PATCH read:false and toasts', async () => {
    const user = userEvent.setup()
    renderApp(<Messages />)
    await user.click(await screen.findByRole('button', { name: /Grace Hopper/ }))
    expect(api.patch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Mark as unread' }))
    expect(api.patch).toHaveBeenCalledWith('/contact/2', { read: false })
    await waitFor(() => expect(toast()).toHaveTextContent('Marked as unread'))
    expect(screen.getByRole('button', { name: 'Mark as read' })).toBeInTheDocument()
  })

  it('deletes after a confirm that names the sender', async () => {
    const user = userEvent.setup()
    renderApp(<Messages />)
    await user.click(await screen.findByRole('button', { name: /Alan Turing/ }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const c = screen.getByRole('alertdialog', { name: 'Delete the message from Alan Turing?' })
    await user.click(within(c).getByRole('button', { name: 'Keep it' }))
    expect(api.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete message' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/contact/3'))
    await waitFor(() => expect(toast()).toHaveTextContent('Message deleted'))
    expect(screen.queryByRole('button', { name: /Alan Turing/ })).not.toBeInTheDocument()
  })

  it('searches and filters with counts, with the empty states', async () => {
    const user = userEvent.setup()
    renderApp(<Messages />)
    await screen.findByText(/messages from the Hire me form/)
    for (const n of ['All 3', 'Unread 1', 'Roles 1', 'Freelance 1', 'Hellos 1']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Freelance 1' }))
    expect(within(screen.getByRole('region', { name: 'Message list' })).getAllByRole('button')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'All 3' }))
    await user.type(screen.getByLabelText('Search messages'), 'zzz')
    expect(await screen.findByText('No messages match “zzz”.')).toBeInTheDocument()
  })

  it('shows the empty inbox copy', async () => {
    items = []
    renderApp(<Messages />)
    expect(await screen.findByText('No messages yet. They’ll appear here when someone uses Hire me.')).toBeInTheDocument()
  })

  it('never logs message content to the console', async () => {
    const user = userEvent.setup()
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k))
    renderApp(<Messages />)
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join(' ')
    expect(logged).not.toContain('We have a role for you')
    expect(logged).not.toContain('ada@example.com')
    spies.forEach((s) => s.mockRestore())
  })
})
