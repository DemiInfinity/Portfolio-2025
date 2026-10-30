import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkHistory from '../WorkHistory'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const ROLES = [
  { id: 2, position: 'Software Developer', company: 'PASS Ltd', location: 'Thornaby-on-Tees', start_date: '2024-06-01', end_date: '2024-08-01', description: '', achievements: ['a', 'b'], highlights: [], technologies: ['C# / .NET', 'Avalonia', 'MVVM', 'Velopack'], company_url: null },
  { id: 1, position: 'Software Developer', company: 'Cintra HR & Payrolls', location: 'Newcastle, remote', start_date: '2025-08-01', end_date: null, description: 'Full-stack', achievements: ['x'], highlights: ['−80% manual update effort'], technologies: ['Angular'], company_url: null },
  { id: 3, position: 'Mid Software Developer', company: '3T Global', location: 'Newcastle, remote', start_date: '2022-07-01', end_date: '2024-06-01', achievements: [], highlights: [], technologies: [] },
  { id: 4, position: 'Junior Software Developer', company: '3T Global', location: 'Newcastle, remote', start_date: '2021-02-01', end_date: '2022-07-01', achievements: [], highlights: [], technologies: [] },
]

describe('WorkHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 9))
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: ROLES } })
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 9 } } })
  })
  afterEach(() => vi.useRealTimers())

  it('lists the current role first with its range and length, and the sub line', async () => {
    renderApp(<WorkHistory />)
    expect(await screen.findByText('4 roles at 3 companies, newest first. Shown on Experience and the CV.')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Software Developer')
    expect(rows[0]).toHaveTextContent('Current')
    expect(rows[0]).toHaveTextContent('Aug 2025 – now')
    expect(rows[0]).toHaveTextContent('1 yr 3 mos')
    expect(rows[1]).toHaveTextContent('Jun – Aug 2024')
    expect(rows[1]).toHaveTextContent('3 mos')
    expect(rows[1]).toHaveTextContent('+1')
  })

  it('"I work here now" disables and clears Ended; the PUT has end_date null', async () => {
    const user = userEvent.setup()
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Edit Software Developer at PASS Ltd' }))
    const ended = screen.getByLabelText('Ended')
    expect(ended).toHaveValue('2024-08')
    await user.click(screen.getByRole('switch', { name: /I work here now/ }))
    expect(ended).toBeDisabled()
    expect(ended).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/work-history/2', expect.objectContaining({ end_date: null, start_date: '2024-06-01' })))
    // the other current role (Cintra) is ended at the start of this month
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/work-history/1', expect.objectContaining({ end_date: '2026-10-01' })))
    expect(await screen.findByRole('status')).toHaveTextContent('Saved Software Developer at PASS Ltd')
  })

  it('sends achievements and highlights one per line, blanks dropped', async () => {
    const user = userEvent.setup()
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Edit Software Developer at Cintra HR & Payrolls' }))
    expect(screen.getByLabelText('Impact highlights')).toHaveValue('−80% manual update effort')
    fireEvent.change(screen.getByLabelText('Key achievements'), { target: { value: 'a\n\nb' } })
    fireEvent.change(screen.getByLabelText('Impact highlights'), { target: { value: '−80% manual update effort\n−60% lookup time on calls' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/work-history/1', expect.objectContaining({ achievements: ['a', 'b'], highlights: ['−80% manual update effort', '−60% lookup time on calls'] })),
    )
  })

  it('rejects a 61-character highlight or 7 lines without a request', async () => {
    const user = userEvent.setup()
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Edit Software Developer at Cintra HR & Payrolls' }))
    fireEvent.change(screen.getByLabelText('Impact highlights'), { target: { value: 'x'.repeat(61) } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Keep each highlight to 60 characters.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Impact highlights'), { target: { value: '1\n2\n3\n4\n5\n6\n7' } })
    expect(screen.getByText('Up to 6 highlights.')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('requires position, company and start month', async () => {
    const user = userEvent.setup()
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Add a role' }))
    await user.click(screen.getByRole('button', { name: 'Add role' }))
    expect(screen.getByText('Add the job title.')).toBeInTheDocument()
    expect(screen.getByText('Add the company.')).toBeInTheDocument()
    expect(screen.getByText('Add the start month.')).toBeInTheDocument()
    expect(screen.getByLabelText('Position')).toHaveAttribute('aria-invalid', 'true')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('maps a 400 details[] error under its field and keeps the dialog open', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValueOnce({ response: { status: 400, data: { success: false, error: 'Invalid input', details: [{ path: 'company_url', msg: 'Use an http(s) link.' }] } } })
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Edit Software Developer at PASS Ltd' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Use an http(s) link.')).toBeInTheDocument()
    expect(screen.getByLabelText('Company website')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('confirms delete with the role named', async () => {
    const user = userEvent.setup()
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })
    renderApp(<WorkHistory />)
    await user.click(await screen.findByRole('button', { name: 'Edit Software Developer at PASS Ltd' }))
    await user.click(screen.getByRole('button', { name: 'Delete role' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Delete Software Developer at PASS Ltd?' })
    await user.click(within(confirm).getByRole('button', { name: 'Delete role' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/work-history/2'))
    expect(await screen.findByRole('status')).toHaveTextContent('Role deleted')
  })
})
