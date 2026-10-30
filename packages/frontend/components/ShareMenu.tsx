'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent, ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'

export const SHARE_COPIED = 'Link copied'
export const SHARE_COPY_FAILED = 'Couldn’t copy the link. You can copy it from the address bar.'

export function linkedInShareUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

export function emailShareUrl(subject: string, url: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(url)}`
}

/** Clipboard API first; a hidden-textarea copy as the fallback when it is blocked. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the fallback
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    document.body.removeChild(area)
    return Boolean(ok)
  } catch {
    return false
  }
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
    </svg>
  )
}

type ShareMenuProps = {
  /** Canonical absolute URL of the page being shared. */
  url: string
  /** Shared title (native share sheet). */
  title: string
  /** Email subject; defaults to the title. */
  emailSubject?: string
  /** Accessible name of the menu, e.g. "Share this post". */
  label: string
  /** `soft` on light pages, `dark` on the case-study hero. */
  variant?: 'soft' | 'dark'
  /** Which edge of the button the menu lines up with. */
  align?: 'start' | 'end'
  /** Opens above the button (for rows near the bottom of the page). */
  up?: boolean
  /** Show the small helper lines under LinkedIn, Email and More options (blog post variant). */
  descriptions?: boolean
}

/**
 * Share menu (ShareMenu.dc.html): LinkedIn, Email, Copy link and, where the
 * browser has a share sheet, More options. A menu button: aria-haspopup and
 * aria-expanded, opens on click, Enter, Space or ArrowDown; arrow keys,
 * Home and End move; Escape closes and returns focus; outside clicks close.
 * Shares are not tracked.
 */
export default function ShareMenu({ url, title, emailSubject, label, variant = 'soft', align = 'end', up = false, descriptions = false }: ShareMenuProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    setPosition(null)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  const openMenu = () => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    setOpen(true)
  }

  /**
   * QA B-4: the panel is portalled to <body> with fixed positioning, so no
   * animated or transformed ancestor (stacking context) can draw over it.
   * Placed against the trigger, flipped above when there isn't room below,
   * clamped 16px inside the viewport (390px phones), and re-placed on scroll
   * and resize.
   */
  const place = useCallback(() => {
    const menu = menuRef.current
    const button = buttonRef.current
    if (!menu || !button) return
    const box = button.getBoundingClientRect()
    const width = menu.offsetWidth
    const height = menu.offsetHeight
    const vw = document.documentElement.clientWidth || window.innerWidth
    const vh = window.innerHeight
    const gap = 10
    let left = align === 'end' ? box.right - width : box.left
    left = Math.min(Math.max(16, left), Math.max(16, vw - 16 - width))
    const roomBelow = vh - box.bottom - gap
    const roomAbove = box.top - gap
    const flip = up ? roomAbove >= height || roomAbove > roomBelow : roomBelow < height && roomAbove > roomBelow
    const top = flip ? box.top - gap - height : box.bottom + gap
    setPosition({ top: Math.round(top), left: Math.round(left), up: flip })
  }, [align, up])

  // Place the panel first (it is hidden until placed, and hidden elements can't take focus)...
  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  // ...then focus the first item, once, when it has become visible.
  const placed = position !== null
  useLayoutEffect(() => {
    if (open && placed) items()[0]?.focus({ preventScroll: true })
  }, [open, placed])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      // The panel lives in a portal, so "inside" means the trigger's wrapper or the panel.
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, close])

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu()
    }
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (event.key === 'ArrowDown') next = (index + 1) % list.length
    else if (event.key === 'ArrowUp') next = (index - 1 + list.length) % list.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = list.length - 1
    else if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    } else if (event.key === 'Tab') {
      close(false)
      return
    } else if ((event.key === ' ' || event.key === 'Spacebar') && document.activeElement?.tagName === 'A') {
      // Space activates link items too, like the button items.
      event.preventDefault()
      ;(document.activeElement as HTMLElement).click()
      return
    }
    if (next >= 0) {
      event.preventDefault()
      list[next]?.focus()
    }
  }

  const copy = async () => {
    const ok = await copyToClipboard(url)
    close()
    toast.show(ok ? SHARE_COPIED : SHARE_COPY_FAILED, ok ? 'info' : 'error')
  }

  const nativeShare = async () => {
    close()
    try {
      await navigator.share({ title, url })
    } catch {
      // cancelled or unsupported: nothing to do
    }
  }

  const item = (icon: ReactNode, text: string, hint?: string) => (
    <>
      {icon}
      <span>
        {text}
        {descriptions && hint && <small>{hint}</small>}
      </span>
    </>
  )

  return (
    <div className="share-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`share-btn ${variant}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onButtonKeyDown}
      >
        <ShareIcon />
        Share
      </button>
      {open &&
        createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`share-menu share-menu-portal${position?.up ? ' up' : ''}`}
          // Hidden for the first layout pass, until it has been placed.
          style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: 'hidden' }}
          onKeyDown={onMenuKeyDown}
        >
          <a className="share-item" role="menuitem" tabIndex={-1} href={linkedInShareUrl(url)} target="_blank" rel="noopener noreferrer" onClick={() => close(false)}>
            {item(
              <span className="share-ico" style={{ background: '#e8f1fb' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#0a66c2" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.3 21 14.7V21h-4v-5.6c0-1.34-.02-3.06-1.86-3.06-1.87 0-2.15 1.46-2.15 2.96V21H9z" />
                </svg>
              </span>,
              'LinkedIn',
              'Opens LinkedIn with the post’s preview'
            )}
          </a>
          <a className="share-item" role="menuitem" tabIndex={-1} href={emailShareUrl(emailSubject ?? title, url)} onClick={() => close(false)}>
            {item(
              <span className="share-ico" style={{ background: '#f1e8ff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18v12H3zM3 7l9 6 9-6" />
                </svg>
              </span>,
              'Email',
              'Send it to someone'
            )}
          </a>
          <button type="button" className="share-item" role="menuitem" tabIndex={-1} onClick={copy}>
            {item(
              <span className="share-ico" style={{ background: '#fdeaf4' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9d174d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                </svg>
              </span>,
              'Copy link'
            )}
          </button>
          {canNativeShare && (
            <>
              <div className="share-sep" role="separator" />
              <button type="button" className="share-item" role="menuitem" tabIndex={-1} onClick={nativeShare}>
                {item(
                  <span className="share-ico" style={{ background: '#f3f0f7' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f4858" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12h.01M12 12h.01M19 12h.01" />
                    </svg>
                  </span>,
                  'More options',
                  'Your device’s share sheet (phones)'
                )}
              </button>
            </>
          )}
        </div>,
          document.body
        )}
    </div>
  )
}
