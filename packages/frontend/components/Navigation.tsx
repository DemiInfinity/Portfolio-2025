'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Briefcase, BookOpen, Clock, FileText } from 'lucide-react'

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Learning', href: '/learning', icon: BookOpen },
    { name: 'Experience', href: '/experience', icon: Clock },
    { name: 'Blog', href: '/blog', icon: FileText },
  ]

  return (
    <nav className="nav-girly sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
              <img
                src="/brand-logo.png"
                alt="Demi Taylor Nimmo"
                className="h-9 sm:h-11 w-auto max-w-[140px] sm:max-w-[180px] object-contain object-left"
              />
              <span className="text-xl sm:text-2xl font-bold gradient-text whitespace-nowrap hidden sm:inline" style={{ fontFamily: 'Dancing Script, cursive' }}>
                Demi Taylor Nimmo
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="btn-secondary p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 nav-mobile">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`nav-link-mobile ${isActive ? 'nav-link-mobile-active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation
