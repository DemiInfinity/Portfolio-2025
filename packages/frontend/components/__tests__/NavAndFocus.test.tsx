import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import NavigationPending from '../NavigationPending'
import ConsentManager from '../consent/ConsentManager'
import Footer from '../Footer'
import { ToastProvider } from '../ui/Toast'
import { resetConsentMemory, saveConsent } from '@/lib/consent'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

beforeEach(() => {
  window.localStorage.clear()
  resetConsentMemory()
  window.history.replaceState(null, '', '/')
})

describe('B-2: loader while a navigation is pending', () => {
  function Harness() {
    const mainRef = useRef<HTMLElement>(null)
    const [page, setPage] = useState<'home' | 'empty' | 'learning'>('home')
    return (
      <>
        <a href="/learning">Learning</a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/#main">Skip</a>
        <a href="https://example.com/x">External</a>
        <button onClick={() => { window.history.pushState(null, '', '/learning'); setPage('empty') }}>commit-empty</button>
        <button onClick={() => setPage('learning')}>render-learning</button>
        <main id="main" ref={mainRef}>
          {page === 'home' && <p>home page</p>}
          {page === 'learning' && <h1>My learning journey</h1>}
          <NavigationPending mainRef={mainRef} />
        </main>
      </>
    )
  }

  it('shows "Waking the server…" from the click until the new route has content', async () => {
    render(<Harness />)
    const link = screen.getByRole('link', { name: 'Learning' })
    // Stop jsdom navigating; Next's Link does the same.
    link.addEventListener('click', (e) => e.preventDefault(), { once: true })
    fireEvent.click(link)
    expect(screen.getByRole('status')).toHaveTextContent('Waking the server…')

    // URL moved but <main> is empty (the race QA saw): the loader stays.
    await userEvent.click(screen.getByRole('button', { name: 'commit-empty' }))
    expect(screen.getByRole('status')).toHaveTextContent('Waking the server…')

    // The page renders: the loader goes.
    await act(async () => {
      screen.getByRole('button', { name: 'render-learning' }).click()
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My learning journey' })).toBeInTheDocument()
  })

  it('ignores hash links on the same page, external links and modified clicks', () => {
    render(<Harness />)
    for (const name of ['Skip', 'External']) {
      const a = screen.getByRole('link', { name })
      a.addEventListener('click', (e) => e.preventDefault(), { once: true })
      fireEvent.click(a)
    }
    const learning = screen.getByRole('link', { name: 'Learning' })
    learning.addEventListener('click', (e) => e.preventDefault(), { once: true })
    fireEvent.click(learning, { metaKey: true })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('B-3: focus after closing Cookie settings', () => {
  function renderConsent() {
    return render(
      <ToastProvider>
        <main id="main" tabIndex={-1}>
          <ConsentManager />
        </main>
        <Footer />
      </ToastProvider>
    )
  }
  const trigger = () => screen.getByRole('button', { name: 'Choose what’s allowed' })

  it('Escape returns focus to the banner trigger', async () => {
    renderConsent()
    await userEvent.click(trigger())
    expect(screen.getByRole('dialog', { name: 'Cookie settings' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('the close button and the backdrop do the same', async () => {
    renderConsent()
    await userEvent.click(trigger())
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(trigger()).toHaveFocus()
    await userEvent.click(trigger())
    fireEvent.mouseDown(screen.getByTestId('overlay-backdrop'))
    expect(trigger()).toHaveFocus()
  })

  it('Save (banner gone) moves focus to main, not nowhere', async () => {
    renderConsent()
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole('button', { name: 'Save my choices' }))
    expect(screen.queryByRole('region', { name: 'Can I count your visit?' })).not.toBeInTheDocument()
    expect(document.getElementById('main')).toHaveFocus()
  })

  it('from the footer, focus returns to "Cookie settings"', async () => {
    saveConsent({ analytics: false, prefs: false })
    renderConsent()
    const footerButton = screen.getByRole('button', { name: 'Cookie settings' })
    await userEvent.click(footerButton)
    await userEvent.keyboard('{Escape}')
    expect(footerButton).toHaveFocus()
  })
})
