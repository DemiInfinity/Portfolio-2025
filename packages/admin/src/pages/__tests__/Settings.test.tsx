import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '../Settings'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
const refreshUser = vi.fn()
const logout = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: '1', name: 'Demi Taylor Nimmo', email: 'demi@example.com', role: 'admin' }, refreshUser, logout }) }))

let status: Record<string, unknown> = { state: 'idle', generatedAt: null, error: null, pdfUrl: null, size: null }
const toast = () => document.querySelector('.toast')

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    status = { state: 'idle', generatedAt: null, error: null, pdfUrl: null, size: null }
    vi.mocked(api.get).mockImplementation(async (url: string) => (url === '/cv/status' ? { data: { success: true, data: status } } : { data: { success: true, available: false, url: null } }) as never)
  })
  afterEach(() => vi.useRealTimers())

  it('shows the never-built state with no file input', async () => {
    renderApp(<Settings />)
    expect(await screen.findByText('No CV PDF yet, so the Download CV button is hidden on the site.')).toBeInTheDocument()
    expect(screen.getByText('No CV PDF yet')).toBeInTheDocument()
    expect(screen.getByText('Download CV hidden')).toBeInTheDocument()
    expect(document.querySelector('input[type=file]')).toBeNull()
  })

  it('Build it now regenerates and shows the card', async () => {
    const user = userEvent.setup()
    const done = { state: 'idle', generatedAt: new Date().toISOString().replace(/T.*/, 'T09:41:00'), error: null, pdfUrl: 'https://x/cv.pdf?v=1', size: 188416 }
    vi.mocked(api.post).mockImplementation(async () => { status = done; return { data: { success: true, data: done } } as never })
    renderApp(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Build it now' }))
    expect(api.post).toHaveBeenCalledWith('/cv/regenerate')
    expect(await screen.findByText('Rebuilt today, 09:41 · 184 KB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', 'https://x/cv.pdf?v=1')
    await waitFor(() => expect(toast()).toHaveTextContent('CV rebuilt'))
  })

  it('keeps "Build it now" visible and disabled, with the reason, while the build runs (QA NB-3)', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {}))
    renderApp(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Build it now' }))
    const btn = screen.getByRole('button', { name: 'Build it now' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAccessibleDescription('Rebuilding with your latest changes')
  })

  it('a 409 toasts that a rebuild is already running', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 409, data: { success: false, error: 'A CV build is already running' } } })
    renderApp(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Build it now' }))
    await waitFor(() => expect(toast()).toHaveTextContent('A rebuild is already running.'))
  })

  it('a 500 shows the failed notice and toasts', async () => {
    const user = userEvent.setup()
    const failed = { state: 'failed', generatedAt: null, error: 'Font missing', pdfUrl: null, size: null }
    vi.mocked(api.post).mockImplementationOnce(async () => {
      status = failed
      throw { response: { status: 500, data: { success: false, error: 'CV build failed', data: failed } } }
    })
    renderApp(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Build it now' }))
    expect(await screen.findByText('The last rebuild failed. Visitors still get the previous PDF.')).toBeInTheDocument()
    expect(screen.getByText('Font missing')).toBeInTheDocument()
    expect(toast()).toHaveTextContent('CV build failed')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('polls every 3 s while building, then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    status = { state: 'building', generatedAt: '2026-10-20T09:00:00Z', error: null, pdfUrl: 'https://x/cv.pdf', size: 1024 }
    renderApp(<Settings />)
    expect(await screen.findByText('Rebuilding with your latest changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled()
    const calls = () => vi.mocked(api.get).mock.calls.filter((c) => c[0] === '/cv/status').length
    const before = calls()
    status = { ...status, state: 'idle' }
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(calls()).toBe(before + 1)
    expect(await screen.findByText(/^Rebuilt /)).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
    expect(calls()).toBe(before + 1)
  })

  it('validates the new password and the confirm', async () => {
    const user = userEvent.setup()
    renderApp(<Settings />)
    await user.type(screen.getByLabelText('New password'), 'abc')
    expect(screen.getByText('At least 6 characters. 3 to go.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Confirm new password'), 'abd')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(screen.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText("This doesn't match the new password.")).toBeInTheDocument()
    expect(screen.getByText('Enter your current password.')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('a wrong current password shows the field error and does not sign out', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValue({ response: { status: 400, data: { success: false, error: 'Current password is incorrect' } } })
    renderApp(<Settings />)
    await user.type(screen.getByLabelText('Current password'), 'oldpass')
    await user.type(screen.getByLabelText('New password'), 'newpass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Your current password is wrong.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/auth/change-password', { currentPassword: 'oldpass', newPassword: 'newpass1' })
    expect(logout).not.toHaveBeenCalled()
  })

  it('saves the profile and refreshes the user', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } })
    renderApp(<Settings />)
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(screen.getByText('Enter a full email address, like name@example.com.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    await waitFor(() => expect(refreshUser).toHaveBeenCalled())
    expect(api.put).toHaveBeenCalledWith('/auth/profile', { name: 'Demi Taylor Nimmo', email: 'me@example.com' })
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('links to the site with ?exclude_me=1 in a new tab to stop counting this browser', async () => {
    renderApp(<Settings />)
    const region = await screen.findByRole('region', { name: "Don't count my own visits" })
    const link = within(region).getByRole('link', { name: 'Open the site and stop counting this browser' })
    expect(link).toHaveAttribute('href', 'https://www.demitaylornimmo.com/?exclude_me=1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(region).toHaveTextContent("Do it again after clearing this browser's data")
  })
})
