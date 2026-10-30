// QA acceptance tests (plan-admin.md [VT] criteria not covered by the Developer's page tests).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Analytics from '../Analytics'
import Projects from '../Projects'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'
import { SAMPLE } from '@/test/fixtures'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const LIST = [
  { id: 1, title: 'LunaLore', slug: 'lunalore', status: 'in_development', featured: true, image: '', technologies: ['Electron'], images: [], show_on_site: true, has_case_study: true },
]
const FULL = {
  ...LIST[0],
  description: 'VTubers',
  content: '',
  role: null,
  platform: null,
  case_study: { overview: 'Saved overview', challenges: [{ title: 'One codebase', solution: 'Shared packages.' }] },
}

describe('QA: Analytics (T14)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('labels the y axis 0, 20, 40, 60, 80 for a peak of 61', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: SAMPLE } })
    const { container } = renderApp(<Analytics />)
    await screen.findByText('688')
    const ticks = Array.from(container.querySelectorAll('.tick')).map((t) => (t.textContent || '').trim())
    expect([...ticks].sort((a, b) => Number(a) - Number(b))).toEqual(['0', '20', '40', '60', '80'])
  })
})

describe('QA: Projects (T6, T20)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/admin/all') return { data: { success: true, data: LIST } } as never
      return { data: { success: true, data: FULL } } as never
    })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 9, unfeatured: [] } } })
  })

  it('a 400 on case_study.challenges[0].title switches to the Case study tab and marks Challenge 1', async () => {
    const user = userEvent.setup()
    vi.mocked(api.put).mockRejectedValue({
      response: { status: 400, data: { success: false, error: 'Invalid input', details: [{ path: 'case_study.challenges[0].title', msg: 'Too long.' }] } },
    })
    renderApp(<Projects />, { route: '/projects' })
    await user.click(await screen.findByRole('button', { name: 'Edit LunaLore' }))
    const details = await screen.findByRole('tab', { name: /Details/ })
    expect(details).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: /Case study/ })).toHaveAttribute('aria-selected', 'true'))
    const challenge = screen.getByLabelText('Challenge')
    expect(challenge).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Too long.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('sends technologies as an array and gallery lines as images[] with blanks dropped', async () => {
    const user = userEvent.setup()
    renderApp(<Projects />, { route: '/projects' })
    await screen.findByRole('button', { name: 'Edit LunaLore' })
    await user.click(screen.getByRole('button', { name: /New project/ }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'QA app' } })
    fireEvent.change(screen.getByLabelText('Technologies'), { target: { value: 'A, B ,C' } })
    fireEvent.change(screen.getByLabelText('Gallery images'), { target: { value: 'https://x/1.png\n\nhttps://x/2.png\n' } })
    await user.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const [url, body] = vi.mocked(api.post).mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/projects')
    expect(body.technologies).toEqual(['A', 'B', 'C'])
    expect(body.images).toEqual(['https://x/1.png', 'https://x/2.png'])
    expect(body.show_on_site).toBe(true)
  })
})
