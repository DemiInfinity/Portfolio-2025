import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PrivacyPolicyContent } from '../../app/privacy/page'
import { CONSENT_KEY, LEGACY_OPT_OUT_KEY, VISIT_ID_KEY } from '@/lib/consent'
import { EXCLUDE_ME_KEY } from '@/lib/analytics'
import { COLOURWAY_KEY } from '../../app/(home)/home-client'
import { sparkleKey } from '../../app/blog/[slug]/BlogPostClient'

vi.mock('next/navigation', () => ({ usePathname: () => '/privacy', useRouter: () => ({}) }))

describe('privacy page: storage table and processors', () => {
  it('lists every browser storage key the code uses, with its category', () => {
    render(<PrivacyPolicyContent showMarbl={false} />)
    const table = screen.getByRole('table', { name: 'What this site stores in your browser' })
    const rows = within(table).getAllByRole('row').slice(1).map((r) => r.textContent ?? '')
    const row = (key: string) => rows.find((r) => r.includes(key))
    expect(row(CONSENT_KEY)).toMatch(/Essential/)
    expect(row(VISIT_ID_KEY)).toMatch(/localStorage.*Analytics.*30 minutes/)
    expect(row(EXCLUDE_ME_KEY)).toMatch(/Essential/)
    expect(row(COLOURWAY_KEY)).toMatch(/Preferences/)
    expect(row(sparkleKey('').replace(/:$/, ':'))).toMatch(/Preferences/)
    expect(row(LEGACY_OPT_OUT_KEY)).toBeTruthy()
    expect(rows).toHaveLength(6)
  })

  it('names the processors and the visitor rights', () => {
    render(<PrivacyPolicyContent showMarbl={false} />)
    for (const name of ['Supabase', 'Vercel', 'Resend']) expect(screen.getAllByText(name, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Who processes data for me' })).toBeInTheDocument()
    for (const right of ['(access)', '(rectification)', '(erasure)', '(restriction)', '(portability)']) expect(screen.getByText(new RegExp(right.replace(/[()]/g, '\\$&')))).toBeInTheDocument()
    expect(screen.getByText(/right to object to how I use your data/)).toBeInTheDocument()
    expect(screen.getByText(/Withdrawing doesn’t affect anything done before you withdrew it/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ico.org.uk/make-a-complaint' })).toHaveAttribute('href', 'https://ico.org.uk/make-a-complaint/')
    expect(screen.getByText(/0303 123 1113/)).toBeInTheDocument()
    expect(screen.getByText(/Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF/)).toBeInTheDocument()
    expect(screen.getByText(/acknowledge your complaint within 30 days/)).toBeInTheDocument()
    expect(screen.getByText(/12 months and then deleted/)).toBeInTheDocument()
  })

  it('states a lawful basis for each purpose and exactly what Hire me stores', () => {
    render(<PrivacyPolicyContent showMarbl={false} />)
    expect(screen.getByRole('heading', { name: 'Why I’m allowed to use it (lawful basis)' })).toBeInTheDocument()
    expect(screen.getByText(/your consent \(UK GDPR Article 6\(1\)\(a\)\)/)).toBeInTheDocument()
    expect(screen.getByText(/legitimate\s+interests \(Article 6\(1\)\(f\)\)/)).toBeInTheDocument()
    expect(screen.getByText(/strictly necessary/)).toBeInTheDocument()
    expect(screen.getByText(/keeping the site working and secure/)).toBeInTheDocument()
    const hireMe = screen.getByRole('heading', { name: 'If you message me through Hire me' })
    const list = hireMe.nextElementSibling!.nextElementSibling as HTMLElement
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'what you’re getting in touch about (the option you chose)',
      'your name, if you give it',
      'your email address',
      'your message',
      'the page you sent it from',
    ])
    expect(screen.getByText(/don’t store your IP address or any details of your browser/)).toBeInTheDocument()
    expect(screen.getByText(/deleted automatically\s+12 months after I receive them/)).toBeInTheDocument()
    expect(screen.queryByText(/sets no cookies/)).toBeInTheDocument()
    expect(screen.queryByText(/Continued use/)).not.toBeInTheDocument()
  })
})
