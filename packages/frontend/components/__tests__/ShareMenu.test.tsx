import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareMenu, { SHARE_COPIED, SHARE_COPY_FAILED, emailShareUrl, linkedInShareUrl } from '../ShareMenu'
import { ToastProvider } from '../ui/Toast'

const URL_ = 'https://demitaylornimmo.com/blog/automatic-updates'

function renderMenu(props: Partial<Parameters<typeof ShareMenu>[0]> = {}) {
  return render(
    <ToastProvider>
      <p>outside</p>
      <ShareMenu url={URL_} title="How I Built Automatic Updates" label="Share this post" {...props} />
    </ToastProvider>
  )
}

const shareButton = () => screen.getByRole('button', { name: 'Share' })

beforeEach(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true })
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(() => vi.restoreAllMocks())

describe('ShareMenu', () => {
  it('is a closed menu button by default', () => {
    renderMenu()
    expect(shareButton()).toHaveAttribute('aria-haspopup', 'menu')
    expect(shareButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens on click with LinkedIn, Email and Copy link, focusing the first item', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    expect(shareButton()).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu', { name: 'Share this post' })
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['LinkedIn', 'Email', 'Copy link'])
    expect(items[0]).toHaveFocus()
    expect(items[0]).toHaveAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(URL_)}`)
    expect(items[0]).toHaveAttribute('target', '_blank')
    expect(items[0].getAttribute('rel')).toContain('noopener')
    expect(items[1]).toHaveAttribute('href', `mailto:?subject=${encodeURIComponent('How I Built Automatic Updates')}&body=${encodeURIComponent(URL_)}`)
  })

  it('opens with Enter and Space from the keyboard', async () => {
    renderMenu()
    shareButton().focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('arrow keys move, Home/End jump, Escape closes and returns focus', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    const items = screen.getAllByRole('menuitem')
    await userEvent.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(items[0]).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(items[2]).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(items[0]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(items[2]).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(shareButton()).toHaveFocus()
  })

  it('closes on an outside click', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Copy link copies the canonical URL and shows "Link copied"', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SHARE_COPIED))
  })

  it('falls back when the clipboard is blocked, and reports a failure', async () => {
    ;(navigator.clipboard.writeText as any).mockRejectedValue(new Error('blocked'))
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    renderMenu()
    await userEvent.click(shareButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
    expect(exec).toHaveBeenCalledWith('copy')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SHARE_COPIED))

    exec.mockReturnValue(false)
    await userEvent.click(shareButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(SHARE_COPY_FAILED))
  })

  it('shows More options only where navigator.share exists, and uses it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
    renderMenu({ descriptions: true })
    await userEvent.click(shareButton())
    const more = screen.getByRole('menuitem', { name: /More options/ })
    expect(screen.getByText('Opens LinkedIn with the post’s preview')).toBeInTheDocument()
    await userEvent.click(more)
    expect(share).toHaveBeenCalledWith({ title: 'How I Built Automatic Updates', url: URL_ })
  })

  it('dark variant and custom email subject (case study)', async () => {
    renderMenu({ variant: 'dark', emailSubject: 'LunaLore, a case study', label: 'Share this case study' })
    expect(shareButton()).toHaveClass('share-btn', 'dark')
    await userEvent.click(shareButton())
    expect(screen.getByRole('menuitem', { name: 'Email' })).toHaveAttribute('href', emailShareUrl('LunaLore, a case study', URL_))
    expect(linkedInShareUrl('https://x.y/a b')).toBe('https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fx.y%2Fa%20b')
  })

  it('does not send any tracking request', async () => {
    global.fetch = vi.fn()
    renderMenu()
    await userEvent.click(shareButton())
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }))
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('ShareMenu portal (QA B-4)', () => {
  it('renders the panel in document.body, outside any page stacking context', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    const menu = screen.getByRole('menu')
    expect(menu.parentElement).toBe(document.body)
    expect(menu).toHaveClass('share-menu-portal')
    expect(menu.style.visibility).not.toBe('hidden')
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus()
  })

  it('a click inside the portalled panel does not count as an outside click', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    fireEvent.mouseDown(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('Tab from inside the menu closes it', async () => {
    renderMenu()
    await userEvent.click(shareButton())
    await userEvent.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
