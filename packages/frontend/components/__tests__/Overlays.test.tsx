import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SiteHeader, { headerVariantFor } from '../SiteHeader'
import { OverlayProvider } from '../overlays/OverlayProvider'
import { ToastProvider } from '../ui/Toast'
import { firstName } from '../overlays/ContactModal'
import { isActivePath } from '@/lib/nav'

const pathname = vi.hoisted(() => ({ value: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value, useRouter: () => ({ push: vi.fn() }) }))

function renderHeader() {
  return render(
    <ToastProvider>
      <OverlayProvider>
        <SiteHeader />
      </OverlayProvider>
    </ToastProvider>
  )
}

beforeEach(() => {
  pathname.value = '/'
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('active link logic', () => {
  it('marks nested paths', () => {
    expect(isActivePath('/projects/lunalore', '/projects')).toBe(true)
    expect(isActivePath('/blog/a-post/', '/blog')).toBe(true)
    expect(isActivePath('/projects', '/')).toBe(false)
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/blogroll', '/blog')).toBe(false)
  })

  it('picks the header variant', () => {
    expect(headerVariantFor('/projects/lunalore')).toBe('case-study')
    expect(headerVariantFor('/blog/post')).toBe('post')
    expect(headerVariantFor('/projects')).toBe('hero')
  })
})

describe('SiteHeader', () => {
  it('lists the five links in order and marks the current one', () => {
    pathname.value = '/experience'
    renderHeader()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Home', 'Projects', 'Experience', 'About', 'Blog'])
    expect(within(nav).getByRole('link', { name: 'Experience' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Demi Taylor Nimmo, home' })).toHaveAttribute('href', '/')
  })

  it('marks Projects on a case study and renders a progress bar', () => {
    pathname.value = '/projects/lunalore'
    const { container } = renderHeader()
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')
    expect(container.querySelector('.progress')).toBeInTheDocument()
    expect(container.querySelector('.is-sticky')).toBeInTheDocument()
  })
})

describe('Hire me modal', () => {
  async function open() {
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Hire me' })
    await userEvent.click(trigger)
    return { trigger, dialog: screen.getByRole('dialog', { name: 'Let’s build something' }) }
  }

  it('opens with the role kind selected and toggles kinds', async () => {
    const { dialog } = await open()
    const role = within(dialog).getByRole('button', { name: 'A full-time role' })
    const freelance = within(dialog).getByRole('button', { name: 'Freelance work' })
    expect(role).toHaveAttribute('aria-pressed', 'true')
    expect(freelance).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(freelance)
    expect(freelance).toHaveAttribute('aria-pressed', 'true')
    expect(role).toHaveAttribute('aria-pressed', 'false')
  })

  it('Escape closes and returns focus to the Hire me button', async () => {
    const { trigger } = await open()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on backdrop click but not on panel click, and locks scrolling', async () => {
    const { dialog } = await open()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.mouseDown(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('overlay-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('traps Tab inside the dialog', async () => {
    const { dialog } = await open()
    for (let i = 0; i < 15; i++) {
      await userEvent.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('blocks an unfinished email without a request', async () => {
    const { dialog } = await open()
    await userEvent.type(within(dialog).getByLabelText('Email'), 'hello@')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('That email looks unfinished.')).toBeInTheDocument()
  })

  it('sends the exact payload and shows the thank-you', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 201 })
    const { dialog } = await open()
    await userEvent.type(within(dialog).getByLabelText('Your name'), 'Ada Lovelace')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(within(dialog).getByLabelText('Message'), 'Hi')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }))
    await screen.findByText('Message sent!')
    const [, init] = (global.fetch as any).mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({
      kind: 'role',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hi',
      website: '',
      source_path: '/',
    })
    expect(screen.getByText('Thank you, Ada. I’ll reply to your inbox within a couple of days.')).toBeInTheDocument()
  })

  it('keeps the form and shows the error toast on failure', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 })
    const { dialog } = await open()
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Couldn’t send. Check your connection and try again.')
    )
    expect(within(dialog).getByLabelText('Email')).toHaveValue('ada@example.com')
  })

  it('marks the field named in a 400 response', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, details: [{ path: 'message', msg: 'required' }] }),
    })
    const { dialog } = await open()
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(within(dialog).getByLabelText('Message')).toHaveAttribute('aria-invalid', 'true'))
  })

  it('shows Sending and disables the button while pending', async () => {
    let resolve: (v: unknown) => void = () => {}
    ;(global.fetch as any).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const { dialog } = await open()
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }))
    expect(within(dialog).getByRole('button', { name: 'Sending' })).toBeDisabled()
    resolve({ ok: true, status: 201 })
    await screen.findByText('Message sent!')
  })

  it('has the Prefer email link', async () => {
    const { dialog } = await open()
    expect(within(dialog).getByRole('link', { name: 'demi.21@outlook.com' })).toHaveAttribute(
      'href',
      'mailto:demi.21@outlook.com'
    )
  })

  it('first name falls back to friend', () => {
    expect(firstName('  ')).toBe('friend')
    expect(firstName('Ada Lovelace')).toBe('Ada')
  })
})

describe('Mobile menu', () => {
  it('opens a Mobile navigation, marks the current page and hands over to Hire me', async () => {
    pathname.value = '/blog'
    renderHeader()
    const opener = screen.getByRole('button', { name: 'Open menu' })
    await userEvent.click(opener)
    const drawer = screen.getByRole('navigation', { name: 'Mobile' })
    expect(within(drawer).getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(within(drawer).getByRole('button', { name: 'Hire me' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Let’s build something' })).toBeInTheDocument()
  })

  it('Escape closes it and focus returns to Open menu', async () => {
    renderHeader()
    const opener = screen.getByRole('button', { name: 'Open menu' })
    await userEvent.click(opener)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('a link click closes it', async () => {
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByRole('navigation', { name: 'Mobile' })
    await userEvent.click(within(drawer).getByRole('link', { name: 'Projects' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
  })
})
