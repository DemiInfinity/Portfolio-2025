import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Certifications, { expiryPill } from '../Certifications'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

describe('expiryPill', () => {
  const today = new Date(2026, 9, 27)
  it('matches the design cases', () => {
    expect(expiryPill('2026-12-01', today)).toEqual(['Expires in 35 days', 'draft'])
    expect(expiryPill('2026-01-01', today)).toEqual(['Expired Jan 2026', 'neg'])
    expect(expiryPill('2027-06-01', today)).toEqual(['Valid to Jun 2027', 'live'])
    expect(expiryPill(null, today)).toEqual(['No expiry', 'off'])
  })
})

describe('Certifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 1 } } })
  })

  it('shows the empty state and the rail copy', async () => {
    renderApp(<Certifications />)
    expect(await screen.findByText('No certifications yet')).toBeInTheDocument()
    expect(screen.getByText('None listed yet. They show on the About page and the CV.')).toBeInTheDocument()
    expect(screen.getByText("The CV leaves out the Certifications section while this list is empty, so there's no blank heading.")).toBeInTheDocument()
  })

  it('shows three errors and sends nothing when the required fields are empty', async () => {
    const user = userEvent.setup()
    renderApp(<Certifications />)
    await user.click(await screen.findByRole('button', { name: 'Add your first certification' }))
    const b = screen.getAllByRole('button', { name: 'Add certification' }); await user.click(b[b.length - 1])
    expect(screen.getByText("Add the certification's name.")).toBeInTheDocument()
    expect(screen.getByText('Add who issued it.')).toBeInTheDocument()
    expect(screen.getByText('Add the issue date.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('posts the whole form with null expiry and empty skills', async () => {
    const user = userEvent.setup()
    renderApp(<Certifications />)
    await user.click(await screen.findByRole('button', { name: 'Add your first certification' }))
    fireEvent.change(screen.getByLabelText('Certification name'), { target: { value: 'AWS CCP' } })
    fireEvent.change(screen.getByLabelText('Issuer'), { target: { value: 'AWS' } })
    fireEvent.change(screen.getByLabelText('Issued'), { target: { value: '2026-05-01' } })
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, name: 'AWS CCP', issuer: 'AWS', issue_date: '2026-05-01', expiry_date: null, credential_id: 'X1', credential_url: '', description: '', skills: [] }] } })
    const buttons = screen.getAllByRole('button', { name: 'Add certification' })
    await user.click(buttons[buttons.length - 1])
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/certifications', { name: 'AWS CCP', issuer: 'AWS', issue_date: '2026-05-01', expiry_date: null, credential_id: '', credential_url: '', description: '', skills: [] }),
    )
    expect(await screen.findByText('AWS, 2026 · ID X1')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved AWS CCP')
  })
})
