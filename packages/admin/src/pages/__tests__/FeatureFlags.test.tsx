import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeatureFlags from '../FeatureFlags'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'
import { flagLabel } from '@/lib/flags'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const FLAGS = [
  { id: 1, name: 'maintenance_mode', description: 'Shows every visitor the maintenance page instead of the site.', enabled: false },
  { id: 2, name: 'open_to_work', description: 'The Open to work badge beside your name on the home page.', enabled: true },
  { id: 3, name: 'show_marbl', description: 'Includes Marbl in the apps the Privacy and Terms pages cover.', enabled: false },
]
let flags = FLAGS
const toast = () => document.querySelector('.toast')

describe('flagLabel', () => {
  it('uses known labels and humanises the rest', () => {
    expect(flagLabel('maintenance_mode')).toBe('Maintenance mode')
    expect(flagLabel('show_reviews')).toBe('Show reviews')
  })
})

describe('FeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    flags = FLAGS.map((f) => ({ ...f }))
    vi.mocked(api.get).mockImplementation(async () => ({ data: { success: true, data: flags } }) as never)
    vi.mocked(api.put).mockImplementation(async (url: string, body: unknown) => {
      const id = Number(url.split('/').pop())
      flags = flags.map((f) => (f.id === id ? { ...f, ...(body as object) } : f))
      return { data: { success: true } } as never
    })
  })

  it('shows the sub line and the preview', async () => {
    renderApp(<FeatureFlags />)
    expect(await screen.findByText('3 flags, 1 on. Each switches part of the live site.')).toBeInTheDocument()
    expect(screen.getByText('Open to work')).toBeInTheDocument()
    expect(screen.getByText('This site and the listed apps. Marbl is left out.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })

  it('asks before turning maintenance on; Cancel sends nothing; Turn it on shows the notice and Back soon', async () => {
    const user = userEvent.setup()
    renderApp(<FeatureFlags />)
    await user.click(await screen.findByRole('switch', { name: 'Maintenance mode' }))
    const c = screen.getByRole('alertdialog', { name: 'Turn on maintenance mode?' })
    await user.click(within(c).getByRole('button', { name: 'Cancel' }))
    expect(api.put).not.toHaveBeenCalled()
    await user.click(screen.getByRole('switch', { name: 'Maintenance mode' }))
    await user.click(screen.getByRole('button', { name: 'Turn it on' }))
    expect(api.put).toHaveBeenCalledWith('/feature-flags/1', { enabled: true })
    expect(await screen.findByText('Back soon')).toBeInTheDocument()
    expect(screen.getByText('Maintenance mode is on.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Turn it off' }))
    await waitFor(() => expect(toast()).toHaveTextContent('Maintenance mode off. The site is live.'))
  })

  it('turning off Open to work removes the pill and toasts', async () => {
    const user = userEvent.setup()
    renderApp(<FeatureFlags />)
    await user.click(await screen.findByRole('switch', { name: 'Open to work badge' }))
    expect(api.put).toHaveBeenCalledWith('/feature-flags/2', { enabled: false })
    await waitFor(() => expect(screen.queryByText('Open to work')).not.toBeInTheDocument())
    await waitFor(() => expect(toast()).toHaveTextContent('Open to work badge off'))
  })

  it('validates the new key, rejects a taken one and posts without enabled', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } })
    renderApp(<FeatureFlags />)
    await user.click(await screen.findByRole('button', { name: 'New flag' }))
    const keyInput = screen.getByLabelText('Key')
    await user.type(keyInput, 'Show Reviews')
    await user.click(screen.getByRole('button', { name: 'Create flag' }))
    expect(keyInput).toHaveAttribute('aria-invalid', 'true')
    expect(api.post).not.toHaveBeenCalled()
    await user.clear(keyInput)
    await user.type(keyInput, 'open_to_work')
    await user.click(screen.getByRole('button', { name: 'Create flag' }))
    expect(screen.getByText('A flag called open_to_work already exists.')).toBeInTheDocument()
    await user.clear(keyInput)
    await user.type(keyInput, 'show_reviews')
    await user.click(screen.getByRole('button', { name: 'Create flag' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/feature-flags', { name: 'show_reviews', description: '' }))
    await waitFor(() => expect(toast()).toHaveTextContent('Created show_reviews, off'))
  })

  it('shows a server 409 under Key and keeps the dialog open', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValue({ response: { status: 409, data: { success: false, error: 'A flag called x_y already exists.' } } })
    renderApp(<FeatureFlags />)
    await user.click(await screen.findByRole('button', { name: 'New flag' }))
    await user.type(screen.getByLabelText('Key'), 'x_y')
    await user.click(screen.getByRole('button', { name: 'Create flag' }))
    expect(await screen.findByText('A flag called x_y already exists.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'New flag' })).toBeInTheDocument()
    expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('enabled')
  })

  it('offers delete only for custom flags, with a named confirm', async () => {
    const user = userEvent.setup()
    flags = [...flags, { id: 9, name: 'show_reviews', description: 'Reviews.', enabled: false }]
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })
    renderApp(<FeatureFlags />)
    await user.click(await screen.findByRole('button', { name: 'Delete show_reviews' }))
    const c = screen.getByRole('alertdialog', { name: 'Delete show_reviews?' })
    await user.click(within(c).getByRole('button', { name: 'Delete flag' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/feature-flags/9'))
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(1)
  })
})
