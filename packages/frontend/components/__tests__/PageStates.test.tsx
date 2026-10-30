import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageLoading from '../PageLoading'
import PageError from '../PageError'

describe('PageLoading', () => {
  it('renders a status with the design copy', () => {
    render(<PageLoading />)
    expect(screen.getByRole('status')).toHaveTextContent('Waking the server…')
  })
})

describe('PageError', () => {
  it('shows the title, Try again and Back to home', async () => {
    const reset = vi.fn()
    render(<PageError title="Couldn't load projects" reset={reset} />)
    expect(screen.getByRole('heading', { level: 1, name: "Couldn't load projects" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('inline variant uses Retry and no home link', () => {
    render(<PageError inline headingLevel={3} retryLabel="Retry" reset={() => {}} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to home' })).not.toBeInTheDocument()
  })
})
