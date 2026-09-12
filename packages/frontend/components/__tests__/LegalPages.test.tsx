import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrivacyPolicyContent, privacyMetadataFor } from '../../app/privacy/page'
import { TermsOfUseContent, termsMetadataFor } from '../../app/terms/page'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('legal pages', () => {
  it('exports privacy metadata and website headings when Marbl is hidden', () => {
    const privacyMetadata = privacyMetadataFor(false)
    expect(privacyMetadata.title).toBe('Privacy Policy')
    expect(privacyMetadata.description).toBe(
      'Privacy Policy for this website, published by Demi Taylor Nimmo.'
    )
    expect(privacyMetadata.openGraph?.title).toBe('Privacy Policy | Demi Taylor Nimmo')
    expect(privacyMetadata.alternates?.canonical).toMatch(/\/privacy$/)
    render(<PrivacyPolicyContent showMarbl={false} />)

    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'This website' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'What we collect when you visit' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Our apps' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Marbl' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'demi.21@outlook.com' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Terms of Use' })[0]).toHaveAttribute('href', '/terms')
  })

  it('shows Marbl collection details on privacy when the flag is on', () => {
    const privacyMetadata = privacyMetadataFor(true)
    expect(privacyMetadata.description).toMatch(/Marbl/)
    render(<PrivacyPolicyContent showMarbl={true} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Our apps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Marbl' })).toBeInTheDocument()
    expect(screen.getByText('Marbl data collection')).toBeInTheDocument()
  })

  it('exports terms metadata and website headings when Marbl is hidden', () => {
    const termsMetadata = termsMetadataFor(false)
    expect(termsMetadata.title).toBe('Terms of Use')
    expect(termsMetadata.description).toBe(
      'Terms of Use for this website, published by Demi Taylor Nimmo.'
    )
    expect(termsMetadata.openGraph?.title).toBe('Terms of Use | Demi Taylor Nimmo')
    expect(termsMetadata.alternates?.canonical).toMatch(/\/terms$/)
    render(<TermsOfUseContent showMarbl={false} />)

    expect(screen.getByRole('heading', { level: 1, name: /terms of use/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'This website' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Our apps' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Marbl' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'demi.21@outlook.com' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Privacy Policy' })[0]).toHaveAttribute('href', '/privacy')
  })

  it('shows Marbl terms when the flag is on', () => {
    const termsMetadata = termsMetadataFor(true)
    expect(termsMetadata.description).toMatch(/Marbl/)
    render(<TermsOfUseContent showMarbl={true} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Our apps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Marbl' })).toBeInTheDocument()
  })
})
