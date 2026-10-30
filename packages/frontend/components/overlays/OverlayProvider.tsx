'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import ContactModal from './ContactModal'
import MobileMenu from './MobileMenu'

export type OverlayMode = 'contact' | 'menu' | null

type OverlayApi = {
  mode: OverlayMode
  openContact: () => void
  openMenu: () => void
  close: () => void
}

const OverlayContext = createContext<OverlayApi | null>(null)

/** One overlay open at a time: the Hire me modal or the mobile menu. */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<OverlayMode>(null)
  // Each overlay restores focus to what had it when it opened. When the menu
  // hands over to the contact modal, the menu returns focus to "Open menu"
  // first, so the modal later returns focus there too.
  const open = useCallback((next: Exclude<OverlayMode, null>) => setMode(next), [])
  const close = useCallback(() => setMode(null), [])

  const openContact = useCallback(() => open('contact'), [open])
  const openMenu = useCallback(() => open('menu'), [open])

  return (
    <OverlayContext.Provider value={{ mode, openContact, openMenu, close }}>
      {children}
      {mode === 'contact' && <ContactModal onClose={close} />}
      {mode === 'menu' && <MobileMenu onClose={close} onContact={openContact} />}
    </OverlayContext.Provider>
  )
}

export function useOverlay(): OverlayApi {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlay must be used inside <OverlayProvider>')
  return ctx
}

/** Same as useOverlay, but null outside the provider (bare routes such as /cv). */
export function useOptionalOverlay(): OverlayApi | null {
  return useContext(OverlayContext)
}
