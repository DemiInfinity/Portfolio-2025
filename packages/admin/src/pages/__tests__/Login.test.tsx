import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../Login'

const mockLogin = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, loading: false }),
}))

const fill = (email: string, pw: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: pw } })
}

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the sign-in card with the design copy', () => {
    const { container } = render(<Login />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(container.textContent).toContain('Edit the projects, posts and roles on demitaylornimmo.com.')
    expect(container.textContent).toContain('Only the site owner has an account.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(container.querySelector('form')).toHaveAttribute('novalidate')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('updates input values when typing', () => {
    render(<Login />)
    fill('test@example.com', 'password123')
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('password123')
  })

  it('submitting empty shows both errors and does not call login', () => {
    render(<Login />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter the email you sign in with, like name@example.com.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('"name@x" with password "a" shows only the email error', () => {
    render(<Login />)
    fill('name@x', 'a')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter the email you sign in with, like name@example.com.')).toBeInTheDocument()
    expect(screen.queryByText('Enter your password.')).not.toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login with the email and password', async () => {
    mockLogin.mockResolvedValue(undefined)
    render(<Login />)
    fill('test@example.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123'))
  })

  it('shows "Signing in" and disables the button while pending', async () => {
    let resolve!: () => void
    mockLogin.mockImplementation(() => new Promise<void>((r) => { resolve = r }))
    render(<Login />)
    fill('test@example.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const btn = await screen.findByRole('button', { name: 'Signing in' })
    expect(btn).toBeDisabled()
    expect(btn.querySelector('.spin')).toBeTruthy()
    resolve()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled())
  })

  it('on failure shows the alert, clears the password and keeps the email', async () => {
    mockLogin.mockRejectedValue({ response: { status: 401 } })
    render(<Login />)
    fill('test@example.com', 'wrong-password')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("That email and password don't match. Try again.")
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')
  })

  it('"Show" switches the password to text and the button to "Hide"', async () => {
    const user = userEvent.setup()
    render(<Login />)
    const toggle = screen.getByRole('button', { name: 'Show' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true')
  })
})
