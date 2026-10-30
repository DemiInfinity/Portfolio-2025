'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import IconButton, { CloseIcon } from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import { useOverlayBehaviour } from './useOverlayBehaviour'
import { MAIN_LINKS, isActivePath } from '@/lib/nav'
import { contact } from '@/lib/content/site'

/** Drawer from the right (Overlays, menu branch). */
export default function MobileMenu({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  useOverlayBehaviour(navRef, onClose)

  return (
    <>
      <div className="ov-backdrop" data-testid="overlay-backdrop" onMouseDown={onClose} />
      <nav ref={navRef} className="ov-drawer" aria-label="Mobile" tabIndex={-1}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px' }}>
          <Link href="/" onClick={onClose} aria-label="Demi Taylor Nimmo, home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={128} height={72} style={{ height: 26, width: 'auto' }} />
            <span className="script" style={{ fontSize: 26, color: '#5b21b6' }}>
              Demi
            </span>
          </Link>
          <IconButton aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="ov-stagger" style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="drawer-link"
              aria-current={isActivePath(pathname, link.href) ? 'page' : undefined}
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Button block onClick={onContact}>
            Hire me
          </Button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22, fontSize: 15, fontWeight: 500 }}>
            <a href={contact.github}>GitHub</a>
            <a href={contact.linkedin}>LinkedIn</a>
          </div>
        </div>
      </nav>
    </>
  )
}
