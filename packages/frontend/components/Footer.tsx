'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { contact } from '@/lib/content/site'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Experience', href: '/experience' },
  { label: 'About', href: '/about' },
  { label: 'Learning', href: '/learning' },
  { label: 'Blog', href: '/blog' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'GitHub', href: contact.github },
  { label: 'LinkedIn', href: contact.linkedin },
] as const

/** Footer from Main: logo, links (minus the current page), copyright. */
export default function Footer() {
  const pathname = usePathname() || '/'
  const year = new Date().getFullYear()
  const links = LINKS.filter((link) => link.href !== pathname)

  return (
    <footer className="wrap site-footer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Demi Taylor Nimmo logo" width={128} height={72} loading="lazy" />
      <nav aria-label="Footer">
        {links.map((link) =>
          link.href.startsWith('http') ? (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          )
        )}
      </nav>
      <span>© {year} Demi Taylor Nimmo</span>
    </footer>
  )
}
