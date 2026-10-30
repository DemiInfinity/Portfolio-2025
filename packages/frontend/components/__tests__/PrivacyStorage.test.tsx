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
    for (const right of ['(access)', '(correction)', '(deletion)', '(objection)']) expect(screen.getByText(new RegExp(right.replace(/[()]/g, '\\$&')))).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'ico.org.uk' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/12 months and then deleted/)).toBeInTheDocument()
  })
})
