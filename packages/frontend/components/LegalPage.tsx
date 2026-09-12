import Link from 'next/link'
import type { ReactNode } from 'react'

export const LEGAL_CONTACT_EMAIL = 'demi.21@outlook.com'
export const LEGAL_EFFECTIVE_DATE = '12 September 2026'
export const LEGAL_SITE_URL = 'https://demitaylornimmo.com'

const proseClass = [
  'text-gray-800 leading-relaxed',
  '[&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-800',
  '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-800',
  '[&_p]:mb-4 [&_p]:leading-relaxed',
  '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6',
  '[&_a]:font-medium [&_a]:text-pink-600 [&_a]:underline hover:[&_a]:text-purple-600',
].join(' ')

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

export function OurAppsList() {
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

export default function LegalPage({ title, children, otherHref, otherLabel }: LegalPageProps) {
  return (
    <div
      className="min-h-screen py-20"
      style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #f8f4ff 50%, #fdf2f8 100%)' }}
    >
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1
            className="text-4xl md:text-5xl font-bold gradient-text mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {title}
          </h1>
          <p
            className="text-sm text-gray-600 font-medium"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Effective date: {LEGAL_EFFECTIVE_DATE}
          </p>
        </header>

        <div className={proseClass} style={{ fontFamily: 'Poppins, sans-serif' }}>
          {children}
        </div>

        <footer className="mt-12 pt-8 border-t border-pink-200 text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
          See also:{' '}
          <Link
            href={otherHref}
            className="text-pink-600 hover:text-purple-600 underline font-medium"
          >
            {otherLabel}
          </Link>
        </footer>
      </article>
    </div>
  )
}
