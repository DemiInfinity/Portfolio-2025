import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import AdminNav from './AdminNav'
import AdminTop from './AdminTop'

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="ad-shell">
      <div className="ad-side-slot">
        <AdminNav />
      </div>
      <div className="ad-col">
        <AdminTop />
        <main className="ad-main" style={pathname === '/settings' || pathname === '/about' ? { maxWidth: 1152 } : undefined}>{children}</main>
      </div>
    </div>
  )
}
