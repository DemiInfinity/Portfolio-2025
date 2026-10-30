import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from '../Layout'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

const logout = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'admin' },
    logout,
  }),
}))

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const flags = (maintenance: boolean) => ({
  data: { success: true, data: [
    { id: 1, name: 'maintenance_mode', description: '', enabled: maintenance },
    { id: 2, name: 'open_to_work', description: '', enabled: true },
  ] },
})

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}

const ui = (
  <Layout>
    <Routes>
      <Route path="*" element={<Where />} />
    </Routes>
  </Layout>
)

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(flags(false))
  })

  it('shows the unread badge on Messages (sidebar and sheet), hidden at 0', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockImplementation(async (url: string) => (url === '/contact/unread-count' ? { data: { success: true, unread: 3 } } : flags(false)) as never)
    const { container } = renderApp(ui)
    const side = container.querySelector('nav.ad-side') as HTMLElement
    expect(await within(side).findByRole('link', { name: 'Messages 3 unread' })).toHaveAttribute('href', '/messages')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(within(screen.getByRole('dialog', { name: 'Admin menu' })).getByRole('link', { name: 'Messages 3 unread' })).toBeInTheDocument()
  })

  it('hides the badge when there are no unread messages', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => (url === '/contact/unread-count' ? { data: { success: true, unread: 0 } } : flags(false)) as never)
    const { container } = renderApp(ui)
    await screen.findByText('Live')
    expect(within(container.querySelector('nav.ad-side') as HTMLElement).getByRole('link', { name: 'Messages' })).toBeInTheDocument()
    expect(container.querySelector('.ad-link .count')).toBeNull()
  })

  it('renders the brand, the user and the sign out button', () => {
    const { container } = renderApp(ui)
    expect(container.textContent).toContain('Demi')
    expect(container.textContent).toContain('Admin')
    expect(container.textContent).toContain('Test User')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('renders the 12 links in order under Content and Site, with the design labels', () => {
    const { container } = renderApp(ui, { route: '/blog' })
    const side = container.querySelector('nav.ad-side') as HTMLElement
    const labels = within(side).getAllByRole('link').slice(1).map((a) => a.textContent)
    expect(labels).toEqual(['Dashboard', 'Messages', 'About', 'Projects', 'Blog', 'Work history', 'Education', 'Certifications', 'Learning', 'Analytics', 'Feature flags', 'Settings'])
    expect(side.textContent).toContain('Content')
    expect(side.textContent).toContain('Site')
    expect(container.querySelector('a[href="/"]')).toBeTruthy()
    expect(container.querySelector('a[href="/projects"]')).toBeTruthy()
    const current = side.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('Blog')
  })

  it('calls logout from the sidebar', async () => {
    const user = userEvent.setup()
    renderApp(ui)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalled()
  })

  it('reads Live, or "Maintenance page showing" when maintenance_mode is on', async () => {
    renderApp(ui)
    expect(await screen.findByText('Live')).toBeInTheDocument()
  })

  it('shows "Maintenance page showing" when the flag is on', async () => {
    vi.mocked(api.get).mockResolvedValue(flags(true))
    renderApp(ui)
    expect(await screen.findByText('Maintenance page showing')).toBeInTheDocument()
  })

  it('writes the top search to ?q= with the per-page placeholder', async () => {
    const user = userEvent.setup()
    renderApp(ui, { route: '/projects' })
    const box = screen.getByRole('searchbox')
    expect(box).toHaveAttribute('placeholder', 'Search projects')
    expect(screen.getByLabelText('Search the admin')).toBe(box)
    await user.type(box, 'luna')
    expect(box).toHaveValue('luna')
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/projects?q=luna'))
  })

  it('keeps every character when typed with no delay (QA NB-1)', async () => {
    const user = userEvent.setup({ delay: null })
    renderApp(ui, { route: '/projects' })
    const box = screen.getByRole('searchbox')
    await user.type(box, 'sqlite')
    expect(box).toHaveValue('sqlite')
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/projects?q=sqlite'))
  })

  it('opens the phone menu sheet, closes on a link click and on Esc, and restores focus', async () => {
    const user = userEvent.setup()
    renderApp(ui)
    const open = screen.getByRole('button', { name: 'Open menu' })
    expect(open).toHaveAttribute('aria-expanded', 'false')
    await user.click(open)
    const sheet = screen.getByRole('dialog', { name: 'Admin menu' })
    expect(within(sheet).getAllByRole('link')).toHaveLength(13) // 12 nav + View site
    expect(within(sheet).getByRole('button', { name: 'Close menu' })).toHaveFocus()
    await user.click(within(sheet).getByRole('link', { name: 'Education' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/education')
    await user.click(open)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(open).toHaveFocus()
  })
})
