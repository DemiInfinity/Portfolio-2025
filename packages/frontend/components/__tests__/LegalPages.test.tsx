import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrivacyPolicyPage, { metadata as privacyMetadata } from '../../app/privacy/page'
import TermsOfUsePage, { metadata as termsMetadata } from '../../app/terms/page'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('legal pages', () => {
  it('exports privacy metadata and key headings', () => {
    expect(privacyMetadata.title).toBe('Privacy Policy')
    expect(privacyMetadata.openGraph?.title).toBe('Privacy Policy | Demi Taylor Nimmo')
    expect(privacyMetadata.alternates?.canonical).toMatch(/\/privacy$/)
    render(<PrivacyPolicyPage />)

    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Our apps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'This website' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'What we collect when you visit' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Marbl' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'demi.21@outlook.com' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Terms of Use' })[0]).toHaveAttribute('href', '/terms')
  })

  it('exports terms metadata and key headings', () => {
    expect(termsMetadata.title).toBe('Terms of Use')
    expect(termsMetadata.openGraph?.title).toBe('Terms of Use | Demi Taylor Nimmo')
    expect(termsMetadata.alternates?.canonical).toMatch(/\/terms$/)
    render(<TermsOfUsePage />)

    expect(screen.getByRole('heading', { level: 1, name: /terms of use/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Our apps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'This website' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Marbl' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'demi.21@outlook.com' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Privacy Policy' })[0]).toHaveAttribute('href', '/privacy')
  })
})
