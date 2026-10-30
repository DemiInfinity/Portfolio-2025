import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, act, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Learning from '../Learning'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const C = (id: number, title: string, progress: number, extra: Record<string, unknown> = {}) => ({
  id, title, description: 'Goal', progress, category: 'Cat', start_date: '2025-06-01', estimated_completion: null, resources: [], status: 'in_progress', ...extra,
})
const COURSES = [
  C(1, 'The Complete Full-Stack Web Development Bootcamp', 19),
  C(2, 'Complete Web & Mobile Designer: UI/UX, Figma and more', 18),
  C(3, 'The Complete Cypress v13 Course: Automation Testing Bootcamp', 15, { start_date: '2025-09-01', estimated_completion: '2025-12-01' }),
  C(4, 'The AI Engineer Course 2025: Complete AI Engineer Bootcamp', 1),
]
const SKILLS = [
  { id: 1, name: 'TypeScript', category: 'Language', level: 'advanced', description: '4 years professionally' },
  { id: 2, name: 'C#', category: 'Language', level: 'advanced', description: '4 years professionally' },
]

let courses: unknown[] = COURSES
const mockGet = () =>
  vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: { success: true, data: url === '/skills' ? SKILLS : courses } }) as never)

describe('Learning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    courses = COURSES
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 9))
    mockGet()
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } })
  })
  afterEach(() => vi.useRealTimers())

  it('shows the overdue pill and the sub line, with no provider before the migration', async () => {
    renderApp(<Learning />)
    expect(await screen.findByText('4 courses in progress, 13% on average. The Complete Cypress v13 Course passed its December 2025 target.')).toBeInTheDocument()
    expect(screen.getByText('Past its December 2025 target')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0].querySelector('.r2')!.textContent).toMatch(/^started Jun 2025/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Edit The Complete Full-Stack Web Development Bootcamp' }))
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
  })

  it('shows the provider in the meta and editor once the API returns the key', async () => {
    courses = COURSES.map((c) => ({ ...c, provider: 'Udemy' }))
    renderApp(<Learning />)
    await screen.findByText(/courses in progress/)
    expect(screen.getAllByRole('listitem')[0].querySelector('.r2')!.textContent).toMatch(/^Udemy · started/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Edit The Complete Full-Stack Web Development Bootcamp' }))
    expect(screen.getByLabelText('Provider')).toHaveValue('Udemy')
  })

  it('debounces quick + clicks into one PUT with the last value, then toasts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 27, 9))
    renderApp(<Learning />)
    await act(async () => { await vi.runOnlyPendingTimersAsync() })
    const group = await screen.findByRole('group', { name: /Change progress for The Complete Cypress/ })
    const up = within(group).getByRole('button', { name: 'Up 5%' })
    fireEvent.click(up)
    expect(within(group).getByText('20%')).toBeInTheDocument()
    fireEvent.click(up)
    fireEvent.click(up)
    expect(api.put).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/learning/3', { progress: 30 })
    expect(document.querySelector('.toast')).toHaveTextContent('Saved: 30%')
  })

  it('disables − at 0 and + at 100; reaching 100 sends completed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    courses = [C(5, 'Zero', 0), C(6, 'Almost', 95)]
    renderApp(<Learning />)
    await act(async () => { await vi.runOnlyPendingTimersAsync() })
    const zero = await screen.findByRole('group', { name: 'Change progress for Zero' })
    expect(within(zero).getByRole('button', { name: 'Down 5%' })).toBeDisabled()
    const almost = screen.getByRole('group', { name: 'Change progress for Almost' })
    fireEvent.click(within(almost).getByRole('button', { name: 'Up 5%' }))
    expect(within(almost).getByRole('button', { name: 'Up 5%' })).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(api.put).toHaveBeenCalledWith('/learning/6', { progress: 100, status: 'completed' })
  })

  it('rolls back and toasts when the PUT fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 27, 9))
    vi.mocked(api.put).mockRejectedValue(new Error('boom'))
    renderApp(<Learning />)
    await act(async () => { await vi.runOnlyPendingTimersAsync() })
    const group = await screen.findByRole('group', { name: /Change progress for The Complete Cypress/ })
    fireEvent.click(within(group).getByRole('button', { name: 'Up 5%' }))
    expect(within(group).getByText('20%')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(within(group).getByText('15%')).toBeInTheDocument()
    expect(document.querySelector('.toast')).toHaveTextContent("Couldn't save progress.")
  })

  it('switches to Skills (?tab=skills) with the skill dialog sub-line', async () => {
    const user = userEvent.setup()
    renderApp(<Learning />)
    await screen.findByText(/courses in progress/)
    await user.click(screen.getByRole('tab', { name: /Skills/ }))
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeInTheDocument()
    expect(screen.getAllByText('Advanced')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Edit TypeScript' }))
    expect(screen.getByText('Advanced and Expert skills show under “Skills mastered” on About. Every skill is on the CV.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/skills/1', { name: 'TypeScript', category: 'Language', level: 'advanced', description: '4 years professionally' }))
  })

  it('names the course in the remove confirm', async () => {
    const user = userEvent.setup()
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })
    renderApp(<Learning />)
    await user.click(await screen.findByRole('button', { name: 'Edit The AI Engineer Course 2025: Complete AI Engineer Bootcamp' }))
    await user.click(screen.getByRole('button', { name: 'Remove course' }))
    const c = screen.getByRole('alertdialog', { name: 'Remove The AI Engineer Course 2025: Complete AI Engineer Bootcamp?' })
    await user.click(within(c).getByRole('button', { name: 'Remove course' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/learning/4'))
    await waitFor(() => expect(document.querySelector('.toast')).toHaveTextContent('Removed'))
  })
})
