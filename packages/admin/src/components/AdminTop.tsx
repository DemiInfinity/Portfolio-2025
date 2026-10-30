import { useLocation } from 'react-router-dom'
import { navFor } from '@/lib/nav'
import { SITE_URL } from '@/lib/config'
import { isOn, useFlags } from '@/lib/flags'
import { useQ } from '@/hooks/useQ'
import Icon from './ui/Icon'

export default function AdminTop() {
  const { pathname } = useLocation()
  const [q, setQ] = useQ()
  const { data: flags } = useFlags()
  const maintenance = isOn(flags, 'maintenance_mode')
  return (
    <div className="ad-topwrap">
      <div className="ad-top">
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="sr" htmlFor="ad-q">Search the admin</label>
          <Icon name="search" size={16} />
          <input id="ad-q" className="input" type="search" placeholder={navFor(pathname).placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="ad-top-right">
          <a className="btn btn-text" href={SITE_URL} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center' }}>
            View site
            <Icon name="external" size={14} />
          </a>
          <div className="ad-switch">
            <span className="ad-sitemark" aria-hidden="true"><img src="/logo.svg" alt="" width={128} height={72} /></span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>demitaylornimmo.com</p>
              <p style={{ fontSize: 12, lineHeight: 1.3, color: maintenance ? '#92400e' : '#247b50' }}>
                {maintenance ? 'Maintenance page showing' : 'Live'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
