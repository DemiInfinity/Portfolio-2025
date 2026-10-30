import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Analytics from '../Analytics'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'
import { SAMPLE } from '@/test/fixtures'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

describe('Analytics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the KPIs, 30 bars with the peak, the referrer footer and no sample notice', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: SAMPLE } })
    renderApp(<Analytics />)
    expect(await screen.findByText('688')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/analytics/summary', { params: { days: 30 } })
    expect(screen.getByText('1,162')).toBeInTheDocument()
    expect(screen.getAllByText('186').length).toBeGreaterThan(0)
    const bars = screen.getAllByRole('button', { name: /visits$/ })
    expect(bars).toHaveLength(30)
    const peak = screen.getByRole('button', { name: '13 Oct, 61 visits' })
    expect(peak).toHaveClass('peak')
    expect(screen.getByTestId('readout')).toHaveTextContent('Peak 61 on 13 Oct')
    fireEvent.focus(peak)
    expect(screen.getByTestId('readout')).toHaveTextContent('13 Oct: 61 visits')
    expect(screen.getByText('688 visits in total, the same as the chart.')).toBeInTheDocument()
    expect(screen.queryByText(/Sample figures/)).not.toBeInTheDocument()
    expect(document.body.textContent).toContain('1 m 33 s')
  })

  it('shows the error card on a 500 and Try again refetches', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValue({ data: { success: true, data: SAMPLE } })
    renderApp(<Analytics />)
    expect(await screen.findByText("Couldn't load analytics.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('688')).toBeInTheDocument()
  })

  it('reads Refreshing while a refetch is pending', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: SAMPLE } })
    renderApp(<Analytics />)
    await screen.findByText('688')
    let resolve!: (v: unknown) => void
    vi.mocked(api.get).mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled()
    resolve({ data: { success: true, data: SAMPLE } })
    expect(await screen.findByRole('button', { name: 'Refresh' })).not.toBeDisabled()
  })

  it('filters the pages card with ?q=', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: SAMPLE } })
    renderApp(<Analytics />, { route: '/analytics?q=blog' })
    expect(await screen.findByText('3 pages')).toBeInTheDocument()
  })

  it('shows the H-23 counting note, the measured caption and the campaigns list', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { ...SAMPLE, trackingVersionSince: '2026-10-31', measuredViews: 1040, campaigns: [{ source: 'linkedin', medium: 'social', campaign: 'launch', visits: 12 }] } } })
    renderApp(<Analytics />)
    expect(await screen.findByTestId('counting-note')).toHaveTextContent('Counting changed on 31 Oct 2026: earlier figures over-counted visits and under-counted time.')
    expect(screen.getByText('Based on 1,040 views with a measured time')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Campaigns' })).toBeInTheDocument()
    expect(screen.getByText('launch')).toBeInTheDocument()
    expect(screen.getByText('linkedin · social')).toBeInTheDocument()
  })

  it('hides the note and the campaigns when the summary has neither', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { ...SAMPLE, campaigns: [] } } })
    renderApp(<Analytics />)
    await screen.findByText('688')
    expect(screen.queryByTestId('counting-note')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Campaigns' })).not.toBeInTheDocument()
  })
})
