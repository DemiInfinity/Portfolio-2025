import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'
import IconButton, { CloseIcon } from '../IconButton'
import { ChipButton } from '../Chip'
import Field from '../Field'
import { ToastProvider, useToast, TOAST_DURATION_MS } from '../Toast'

describe('Button', () => {
  it('renders a link when given href', () => {
    render(<Button href="/x">Go</Button>)
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/x')
  })

  it('renders a type=button button without href', () => {
    render(<Button>Press</Button>)
    expect(screen.getByRole('button', { name: 'Press' })).toHaveAttribute('type', 'button')
  })

  it('loading shows an aria-hidden spinner and keeps the label', () => {
    const { container } = render(<Button loading>Sending</Button>)
    const button = screen.getByRole('button', { name: 'Sending' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(container.querySelector('.spin')).toHaveAttribute('aria-hidden', 'true')
  })

  it('external hrefs render a plain anchor', () => {
    render(<Button href="mailto:a@b.co" variant="light">Mail</Button>)
    expect(screen.getByRole('link', { name: 'Mail' })).toHaveClass('btn', 'btn-light')
  })
})

describe('IconButton', () => {
  it('is exposed by its aria-label', () => {
    render(
      <IconButton aria-label="Close">
        <CloseIcon />
      </IconButton>
    )
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('iconbtn')
  })

  it('requires aria-label at the type level', () => {
    // @ts-expect-error aria-label is required
    const el = <IconButton>x</IconButton>
    expect(el).toBeTruthy()
  })
})

describe('ChipButton', () => {
  it('reflects pressed state', () => {
    render(<ChipButton pressed>Freelance work</ChipButton>)
    expect(screen.getByRole('button', { name: 'Freelance work' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Field', () => {
  it('links the hint and marks errors', () => {
    render(<Field label="Email" hint="That email looks unfinished." state="error" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('input', 'err')
    expect(input).toHaveAccessibleDescription('That email looks unfinished.')
  })
})

describe('useToast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function Trigger() {
    const toast = useToast()
    return <button onClick={() => toast.show('Email copied to your clipboard')}>show</button>
  }

  it('shows a status message and hides it after 2600ms', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    )
    act(() => {
      screen.getByRole('button', { name: 'show' }).click()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Email copied to your clipboard')
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('error variant uses the error style', async () => {
    function ErrorTrigger() {
      const toast = useToast()
      return <button onClick={() => toast.show('Couldn’t send.', 'error')}>err</button>
    }
    render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'err' }))
    expect(screen.getByRole('status')).toHaveClass('toast-error')
  })
})
