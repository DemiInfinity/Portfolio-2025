'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  )
}

/**
 * Shared overlay rules (F-4): focus moves in on open and is trapped while
 * open, Escape closes, the page behind does not scroll, and focus returns to
 * whatever had it before the overlay opened.
 */
export function useOverlayBehaviour(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: { returnFocus?: boolean; initialFocusRef?: RefObject<HTMLElement | null> } = {}
) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const { returnFocus = true, initialFocusRef } = options

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const container = containerRef.current

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const first = initialFocusRef?.current ?? (container ? focusables(container)[0] : null)
    ;(first ?? container)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !container) return
      const items = focusables(container)
      if (items.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && (active === firstItem || !container.contains(active))) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && (active === lastItem || !container.contains(active))) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (returnFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
