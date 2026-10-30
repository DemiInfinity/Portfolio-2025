'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Button from '@/components/ui/Button'
import IconButton, { MenuIcon } from '@/components/ui/IconButton'
import { useOverlay } from '@/components/overlays/OverlayProvider'
import { MAIN_LINKS, isActivePath } from '@/lib/nav'

export type HeaderVariant = 'hero' | 'case-study' | 'post'

export function headerVariantFor(pathname: string | null): HeaderVariant {
  const path = pathname || '/'
  if (/^\/projects\/[^/]+\/?$/.test(path)) return 'case-study'
  if (/^\/blog\/[^/]+\/?$/.test(path)) return 'post'
  return 'hero'
}

/** id of the dark hero on a case study; the header turns light once it has scrolled past. */
export const CASE_STUDY_HERO_ID = 'cs-hero'

/**
 * Header from Main/Projects/Experience/About/Blog. It sits in the page's hero
 * background (pages pull their hero up behind it with `.under-header`).
 * Case study: sticky, dark over the hero, light after it, with a scroll
 * progress bar. Post: sticky and light with a progress bar.
 */
export default function SiteHeader() {
  const pathname = usePathname()
  const { openContact, openMenu } = useOverlay()
  const variant = headerVariantFor(pathname)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    if (variant !== 'case-study') return
    const onScroll = () => {
      const hero = document.getElementById(CASE_STUDY_HERO_ID)
      setPastHero(hero ? hero.getBoundingClientRect().bottom <= 76 : true)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant, pathname])

  const shellClass = [
    'site-header-shell',
    variant !== 'hero' && 'is-sticky',
    variant === 'case-study' && 'is-dark',
    variant === 'case-study' && pastHero && 'is-past',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass} data-variant={variant}>
      <header className="wrap site-header">
        <Link href="/" className="brand" aria-label="Demi Taylor Nimmo, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={128} height={72} />
          <span className="script">Demi</span>
        </Link>
        <nav aria-label="Main" className="main-nav">
          {MAIN_LINKS.map((link) => {
            const active = isActivePath(pathname, link.href)
            return (
              <Link key={link.href} href={link.href} className="navlink" aria-current={active ? 'page' : undefined}>
                {link.label}
              </Link>
            )
          })}
          <Button size="sm" onClick={openContact}>
            Hire me
          </Button>
          <IconButton aria-label="Open menu" className="menu-btn" onClick={openMenu}>
            <MenuIcon />
          </IconButton>
        </nav>
      </header>
      {variant !== 'hero' && <div aria-hidden="true" className="progress" />}
    </div>
  )
}
