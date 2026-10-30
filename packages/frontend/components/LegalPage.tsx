import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

export const LEGAL_CONTACT_EMAIL = 'demi.21@outlook.com'
export const LEGAL_EFFECTIVE_DATE = '30 October 2026'
export const LEGAL_SITE_URL = 'https://demitaylornimmo.com'

type LegalPageProps = {
  title: string
  children: ReactNode
  otherHref: '/privacy' | '/terms'
  otherLabel: string
}

export function LegalContactLink({ children }: { children?: ReactNode }) {
  return (
    <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
      {children ?? LEGAL_CONTACT_EMAIL}
    </a>
  )
}

export function OurAppsList({ showMarbl }: { showMarbl: boolean }) {
  if (!showMarbl) {
    return (
      <p>
        We have not listed a published mobile app here yet. When we do, it will
        appear on this list with its own collection details, instead of
        rewriting these shared rules.
      </p>
    )
  }

  return (
    <>
      <p>Today that list is:</p>
      <ul>
        <li>
          <strong>Marbl</strong> — a local cat-care logging and training helper
        </li>
      </ul>
      <p>
        Additional apps will be added to this list when they are published. When a
        future app is published, it will get its own row or subsection rather than
        rewriting these shared rules.
      </p>
    </>
  )
}

/** Legal pages in the Post reading column (720px, Playfair h2, 17px/1.75 body). */
export default function LegalPage({ title, children, otherHref, otherLabel }: LegalPageProps) {
  return (
    <article style={{ paddingBottom: 100 }}>
      <header className="reading" style={{ paddingTop: 72, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 className="serif in" style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.08 }}>
          {title}
        </h1>
        <p className="in" style={{ ['--d' as string]: '100ms', fontSize: 'var(--t-meta)', color: '#6b5a7e' } as CSSProperties}>
          Effective date: {LEGAL_EFFECTIVE_DATE}
        </p>
      </header>

      <div className="reading prose-dn">{children}</div>

      <footer className="reading" style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e6dcf3', fontSize: 'var(--t-meta)' }}>
        See also:{' '}
        <Link href={otherHref} style={{ color: 'var(--b2)', fontWeight: 600 }}>
          {otherLabel}
        </Link>
      </footer>
    </article>
  )
}
