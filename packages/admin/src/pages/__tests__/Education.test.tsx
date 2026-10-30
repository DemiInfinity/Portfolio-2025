import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Education from '../Education'
import { renderApp } from '@/test/utils'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const ENTRY = { id: 1, institution: 'Teesside University', degree: 'BSc', field_of_study: 'Computer Science', location: 'Middlesbrough', start_date: '2016-09-01', end_date: '2020-06-01', grade: '', description: 'Software engineering.', achievements: [] }

describe('Education', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [ENTRY] } })
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } })
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } })
  })

  it('shows the sub line, the row and the preview as it is now', async () => {
    renderApp(<Education />)
    expect(await screen.findByText('1 entry. Shown on the Experience page and the CV.')).toBeInTheDocument()
    expect(screen.getAllByText('BSc Computer Science').length).toBeGreaterThan(0)
    expect(screen.getByText('2016 – 2020')).toBeInTheDocument()
    expect(screen.getByTestId('edu-preview')).toHaveTextContent('Experience page and CV, as it is now')
  })

  it('counts grade characters, caps at 10 and previews live', async () => {
    const user = userEvent.setup()
    renderApp(<Education />)
    await user.click(await screen.findByRole('button', { name: 'Edit BSc at Teesside University' }))
    const grade = screen.getByLabelText('Grade')
    expect(grade).toHaveAttribute('maxlength', '10')
    await user.type(grade, '2:1')
    expect(screen.getByText(/7 left\./)).toBeInTheDocument()
    const preview = screen.getByTestId('edu-preview')
    expect(preview).toHaveTextContent('Grade: 2:1')
    expect(preview).toHaveTextContent('with your unsaved changes')
    fireEvent.change(grade, { target: { value: '12345678901' } })
    expect(grade).toHaveValue('1234567890')
  })

  it('shows both required errors and sends nothing', async () => {
    const user = userEvent.setup()
    renderApp(<Education />)
    await user.click(await screen.findByRole('button', { name: 'Add education' }))
    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    expect(screen.getByText('Add the institution.')).toBeInTheDocument()
    expect(screen.getByText('Add the degree or qualification.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('PUTs the whole form (full replace) and toasts', async () => {
    const user = userEvent.setup()
    renderApp(<Education />)
    await user.click(await screen.findByRole('button', { name: 'Edit BSc at Teesside University' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/education/1', {
        institution: 'Teesside University', degree: 'BSc', field_of_study: 'Computer Science', location: 'Middlesbrough',
        start_date: '2016-09-01', end_date: '2020-06-01', grade: '', description: 'Software engineering.', achievements: [],
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Saved BSc at Teesside University')
  })
})
