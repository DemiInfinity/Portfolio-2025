import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Footer from '../Footer'

const pathname = vi.hoisted(() => ({ value: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))

describe('Footer', () => {
  it('renders the footer links from the design', () => {
    pathname.value = '/'
    render(<Footer />)
    const nav = screen.getByRole('navigation', { name: 'Footer' })
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/projects',
      '/experience',
      '/about',
      '/learning',
      '/blog',
      '/privacy',
      '/terms',
      'https://github.com/DemiInfinity',
      'https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40',
    ])
  })

  it('displays copyright information', () => {
    render(<Footer />)
    expect(screen.getByText(`© ${new Date().getFullYear()} Demi Taylor Nimmo`)).toBeInTheDocument()
    expect(screen.getByAltText('Demi Taylor Nimmo logo')).toBeInTheDocument()
  })

  it('includes privacy and terms links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('omits the link to the current page and links Home elsewhere', () => {
    pathname.value = '/about'
    render(<Footer />)
    const nav = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(nav).queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  })
})
