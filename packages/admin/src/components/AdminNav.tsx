import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { NAV, navFor, type NavItem } from '@/lib/nav'
import { SITE_URL } from '@/lib/config'
import Icon from './ui/Icon'
import { useModal } from './ui/useModal'

function NavLinkItem({ item, current, size = 18, onClick }: { item: NavItem; current: boolean; size?: number; onClick?: () => void }) {
  return (
    <Link className="ad-link" to={item.path} aria-current={current ? 'page' : undefined} onClick={onClick}>
      <Icon name={item.icon} size={size} />
      {item.label}
    </Link>
  )
}

function MenuSheet({ pathname, onClose, onSignOut }: { pathname: string; onClose: () => void; onSignOut: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useModal(ref, { onClose, initial: closeBtn })
  return (
    <div ref={ref} className="ad-sheet" role="dialog" aria-modal="true" aria-label="Admin menu">
      <div style={{ display: 'flex', alignItems: 'center', height: 56, flex: 'none' }}>
        <span className="ad-word" style={{ fontSize: 22 }}>Demi</span>
        <span className="mute" style={{ fontSize: 13, marginLeft: 6 }}>Admin</span>
        <button ref={closeBtn} type="button" className="iconbtn" onClick={onClose} aria-label="Close menu" style={{ marginLeft: 'auto', color: '#241b33' }}>
          <Icon name="close" size={22} stroke={1.8} />
        </button>
      </div>
      <nav aria-label="Admin" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => (
          <NavLinkItem key={n.path} item={n} current={n.path === pathname} size={20} onClick={onClose} />
        ))}
      </nav>
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        <a className="btn btn-line" href={SITE_URL} target="_blank" rel="noopener noreferrer">View site</a>
        <button type="button" className="btn btn-text" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

export default function AdminNav() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [sheet, setSheet] = useState(false)
  const name = user?.name || user?.email || 'Admin'
  const content = NAV.filter((n) => n.group === 'Content')
  const site = NAV.filter((n) => n.group === 'Site')

  return (
    <>
      <nav className="ad-side" aria-label="Admin">
        <Link className="ad-brand" to="/" aria-label="Demi admin, dashboard">
          <img src="/logo.svg" alt="" width={128} height={72} />
          <span className="ad-word">Demi</span>
          <span className="mute" style={{ fontSize: 13, marginLeft: 2 }}>Admin</span>
        </Link>
        <NavLinkItem item={NAV[0]} current={pathname === '/'} />
        <p className="ad-group">Content</p>
        {content.map((n) => <NavLinkItem key={n.path} item={n} current={n.path === pathname} />)}
        <p className="ad-group">Site</p>
        {site.map((n) => <NavLinkItem key={n.path} item={n} current={n.path === pathname} />)}
        <div className="ad-me">
          <span className="ad-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="b" style={{ fontSize: 13 }}>{name}</p>
            <p className="mute" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Admin</p>
          </div>
          <button type="button" className="iconbtn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="signout" />
          </button>
        </div>
      </nav>

      <div className="ad-phonebar">
        <Link to="/" aria-label="Demi admin, dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/logo.svg" alt="" width={128} height={72} style={{ height: 22, width: 'auto' }} />
          <span className="ad-word" style={{ fontSize: 22 }}>Demi</span>
        </Link>
        <span className="mute" style={{ fontSize: 14 }}>{navFor(pathname).label}</span>
        <button type="button" className="iconbtn" onClick={() => setSheet(true)} aria-label="Open menu" aria-expanded={sheet} style={{ marginLeft: 'auto', color: '#241b33' }}>
          <Icon name="menu" size={22} stroke={1.8} />
        </button>
      </div>

      {sheet ? <MenuSheet pathname={pathname} onClose={() => setSheet(false)} onSignOut={() => { setSheet(false); logout() }} /> : null}
    </>
  )
}
