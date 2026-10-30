'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/overlays/Modal'
import { SPARK_PATH } from '@/components/ui/Spark'
import { useToast } from '@/components/ui/Toast'
import { OPEN_SETTINGS_EVENT, browserAsksNotToTrack, saveConsent } from '@/lib/consent'
import { useConsent, useHydrated } from './useConsent'

export const CONSENT_COPY = {
  bannerTitle: 'Can I count your visit?',
  bannerBody:
    'With your permission I record which pages you view, for how long and where you came from, so I can see what’s useful. No ads, no selling, no third-party trackers. Nothing is recorded unless you say yes.',
  gpcNote: 'Your browser asks sites not to track you, so analytics stays off unless you turn it on yourself.',
  accepted: 'Thanks! Analytics is on.',
  rejected: 'No problem. Nothing is tracked.',
  saved: 'Your choices are saved.',
} as const

function Switch({ checked, label, onToggle, disabled }: { checked: boolean; label: string; onToggle?: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="consent-switch" role="switch" aria-checked={checked} aria-label={label} onClick={onToggle} disabled={disabled}>
      <span className="consent-sw" aria-hidden="true" />
    </button>
  )
}

function SettingsDialog({
  initialAnalytics,
  initialPrefs,
  onDecide,
  onClose,
}: {
  initialAnalytics: boolean
  initialPrefs: boolean
  onDecide: (analytics: boolean, prefs: boolean, message: string) => void
  onClose: () => void
}) {
  const titleId = useId()
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [prefs, setPrefs] = useState(initialPrefs)
  return (
    <Modal labelledBy={titleId} onClose={onClose} returnFocus={false}>
      <div style={{ padding: '28px 28px 8px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 id={titleId} className="serif" style={{ fontSize: 28 }}>Cookie settings</h2>
          <p style={{ marginTop: 6, fontSize: 'var(--t-meta)', color: '#6b5a7e' }}>
            Change these any time from “Cookie settings” at the bottom of every page.
          </p>
        </div>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <ul className="consent-cats">
        <li className="consent-cat">
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              Essential <span className="consent-tag">Always on</span>
            </h3>
            <p style={{ marginTop: 4, fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>
              Remembers this choice so you’re not asked again. Stored in your browser only, never sent to me.
            </p>
          </div>
          <Switch checked label="Essential, always on" disabled />
        </li>
        <li className="consent-cat">
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16 }}>Analytics</h3>
            <p style={{ marginTop: 4, fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>
              Pages viewed, time on page, the site you came from, your browser type, a shortened IP address and a random visit ID. Kept in my own database for 12 months, then deleted. No third-party tools.
            </p>
          </div>
          <Switch checked={analytics} label="Analytics" onToggle={() => setAnalytics((v) => !v)} />
        </li>
        <li className="consent-cat">
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16 }}>Preferences</h3>
            <p style={{ marginTop: 4, fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>
              Remembers small choices, like the home page colour theme. Stored in your browser only.
            </p>
          </div>
          <Switch checked={prefs} label="Preferences" onToggle={() => setPrefs((v) => !v)} />
        </li>
      </ul>
      <div style={{ padding: '16px 28px 26px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #efe6fb', marginTop: 4 }}>
        <div className="consent-row">
          <button type="button" className="consent-btn consent-ghost" onClick={() => onDecide(false, false, CONSENT_COPY.rejected)}>
            Reject all
          </button>
          <button type="button" className="consent-btn consent-ghost" onClick={() => onDecide(true, true, CONSENT_COPY.accepted)}>
            Allow all
          </button>
        </div>
        <button type="button" className="consent-btn consent-solid" onClick={() => onDecide(analytics, prefs, CONSENT_COPY.saved)}>
          Save my choices
        </button>
        <p style={{ fontSize: 12, color: '#6b5a7e', textAlign: 'center' }}>
          More detail in the{' '}
          <Link href="/privacy" style={{ color: '#5b21b6' }} onClick={onClose}>
            privacy policy
          </Link>
          . Turning analytics off deletes the visit ID from your browser.
        </p>
      </div>
    </Modal>
  )
}

/**
 * First-visit banner (Consent) and the Cookie settings dialog. Mounted by
 * SiteChrome, so it never shows on bare routes (/cv) or the maintenance page.
 */
export default function ConsentManager() {
  const consent = useConsent()
  const hydrated = useHydrated()
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const titleId = useId()
  // QA B-3: the dialog can't restore focus itself, because opening it from the
  // banner unmounts the banner (and the button that opened it).
  const opener = useRef<HTMLElement | null>(null)
  const bannerTrigger = useRef<HTMLButtonElement>(null)
  const bannerRef = useRef<HTMLElement>(null)
  const restoreFocus = useRef(false)

  const openSettings = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null
    setSettingsOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    restoreFocus.current = true
    setSettingsOpen(false)
  }, [])

  // Runs after the dialog has closed and the banner (if still needed) is back.
  useEffect(() => {
    if (settingsOpen || !restoreFocus.current) return
    restoreFocus.current = false
    const target = opener.current
    opener.current = null
    if (target && target.isConnected && typeof target.focus === 'function') target.focus()
    else if (bannerTrigger.current) bannerTrigger.current.focus()
    else if (bannerRef.current) bannerRef.current.focus()
    else document.getElementById('main')?.focus()
  }, [settingsOpen, consent])
  const gpc = hydrated && browserAsksNotToTrack()

  useEffect(() => {
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings)
  }, [openSettings])

  const decide = useCallback(
    (analytics: boolean, prefs: boolean, message: string) => {
      saveConsent({ analytics, prefs })
      closeSettings()
      toast.show(message)
    },
    [toast, closeSettings]
  )

  const showBanner = hydrated && consent === null && !settingsOpen

  return (
    <>
      {showBanner && (
        <section ref={bannerRef} tabIndex={-1} className="consent-banner" role="region" aria-labelledby={titleId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#f472b6', flex: 'none' }}>
              <path d={SPARK_PATH} fill="currentColor" />
            </svg>
            <h2 id={titleId} className="serif" style={{ fontSize: 22 }}>{CONSENT_COPY.bannerTitle}</h2>
          </div>
          <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.6 }}>{CONSENT_COPY.bannerBody}</p>
          {gpc && <p className="consent-note">{CONSENT_COPY.gpcNote}</p>}
          <div className="consent-row">
            <button type="button" className="consent-btn consent-ghost" onClick={() => decide(false, false, CONSENT_COPY.rejected)}>
              No thanks
            </button>
            <button type="button" className="consent-btn consent-solid" onClick={() => decide(true, true, CONSENT_COPY.accepted)}>
              Allow analytics
            </button>
          </div>
          <button ref={bannerTrigger} type="button" className="consent-link" style={{ alignSelf: 'flex-start' }} onClick={openSettings}>
            Choose what’s allowed
          </button>
        </section>
      )}
      {settingsOpen && (
        <SettingsDialog
          // Opt-in: switches start off until the visitor has chosen (and stay off by default under GPC/DNT).
          initialAnalytics={consent?.analytics ?? false}
          initialPrefs={consent?.prefs ?? false}
          onDecide={decide}
          onClose={closeSettings}
        />
      )}
    </>
  )
}
