/// <reference types="cypress" />
import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { accName, byName, mockReset, norm, rendered } from '../../../support/frontend/site'

// Opt-in consent (Consent.dc.html), maintenance/404/500 helpers.
const CONSENT_KEY = 'portfolio_consent'
const VISIT_KEY = 'portfolio_visit_id'
const BANNER_TITLE = 'Can I count your visit?'

/** A real key press through CDP, with the text that makes browsers activate buttons (Enter, Space). */
function realKey(key: 'Enter' | 'Space') {
  const params =
    key === 'Enter'
      ? { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }
      : { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ' }
  const send = (type: string, extra: object = {}) =>
    Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { type, ...params, ...extra } })
  return cy.wrap(send('keyDown').then(() => send('keyUp', { text: undefined, unmodifiedText: undefined })), { log: false })
}

function seedConsent(analytics: boolean, prefs: boolean) {
  const value = JSON.stringify({ v: 1, analytics, prefs, at: '2026-10-30T10:00:00.000Z' })
  let done = false
  cy.on('window:before:load', (win) => {
    if (done) return
    done = true
    try {
      win.localStorage.setItem(CONSENT_KEY, value)
    } catch {
      /* ignore */
    }
  })
}

// Every non-consent scenario starts as a visitor who already said "No thanks", so the
// first-visit banner never covers what those scenarios test. @consent scenarios start empty.
Before({ tags: '@site and not @consent' }, () => {
  seedConsent(false, false)
})

Given('the visitor has already chosen analytics {string} and preferences {string}', (a: string, p: string) => {
  seedConsent(a === 'on', p === 'on')
})

function banner() {
  return cy.get('body').then(($b) =>
    Array.from($b[0].querySelectorAll<HTMLElement>('[role="region"], section, aside, div[role="dialog"]')).find(
      (el) => accName(el) === BANNER_TITLE && rendered(el)
    ) || null
  )
}

Then('the consent banner is shown', () => {
  cy.contains('h2', BANNER_TITLE).should('be.visible')
})

Then('the consent banner is not shown', () => {
  cy.get('body').should(($b) => {
    const h = Array.from($b[0].querySelectorAll('h2')).find((x) => norm(x.textContent) === BANNER_TITLE)
    expect(!h || !rendered(h), 'consent banner hidden').to.eq(true)
  })
})

Then('the consent banner shows {string}', (t: string) => {
  cy.contains('h2', BANNER_TITLE).parents('[role="region"], section').first().should(($r) => expect(norm($r[0].innerText)).to.contain(t))
})

function storage(kind: 'localStorage' | 'sessionStorage', key: string) {
  return cy.window().then((win) => win[kind].getItem(key))
}

Then('no visit ID is stored', () => {
  cy.window().should((win) => {
    expect(win.sessionStorage.getItem(VISIT_KEY), 'sessionStorage visit ID').to.eq(null)
    const keys = [...Object.keys(win.localStorage), ...Object.keys(win.sessionStorage)]
    expect(keys.filter((k) => /visit|session_id|visitor/i.test(k)), 'any visit-like key').to.deep.eq([])
  })
})

Then('a visit ID is stored', () => {
  cy.window().should((win) => expect(win.sessionStorage.getItem(VISIT_KEY)).to.be.a('string').and.not.be.empty)
})

Then('localStorage {string} is absent', (key: string) => {
  cy.window().should((win) => expect(win.localStorage.getItem(key)).to.eq(null))
})

Then('the stored consent has analytics {string} and preferences {string}', (a: string, p: string) => {
  cy.window().should((win) => {
    const raw = win.localStorage.getItem(CONSENT_KEY)
    expect(raw, CONSENT_KEY).to.be.a('string')
    const c = JSON.parse(raw as string)
    expect(c.analytics, 'analytics').to.eq(a === 'true')
    expect(c.prefs, 'prefs').to.eq(p === 'true')
  })
})

function trackBodies(calls: any[]) {
  return calls.map((c) => (typeof c.request.body === 'string' ? JSON.parse(c.request.body) : c.request.body))
}

Then('an analytics page view for {string} is sent', (path: string) => {
  cy.get('@track.all', { timeout: 10000 }).should((calls: any) => {
    expect(trackBodies(calls).filter((b) => b.page_path === path && !b.visit_duration), `page view for ${path}`).to.have.length.gte(1)
  })
})

Then('every analytics request carries the stored visit ID', () => {
  storage('sessionStorage', VISIT_KEY).then((id) => {
    cy.get('@track.all').then((calls: any) => {
      trackBodies(calls).forEach((b) => expect(b.session_id).to.eq(id))
    })
  })
})

let trackCount = 0
When('the analytics log is cleared', () => {
  cy.get('@track.all').then((calls: any) => {
    trackCount = calls.length
  })
})

Then('no analytics request was sent since the log was cleared', () => {
  cy.get('@track.all').should((calls: any) => expect(calls.length - trackCount, 'new analytics requests').to.eq(0))
})

function consentSwitch(label: string) {
  return cy.get(`[role="switch"][aria-label="${label}"]`)
}

Then('the {string} switch is {string}', (label: string, state: string) => {
  consentSwitch(label).should('have.attr', 'aria-checked', state === 'on' ? 'true' : 'false')
})

When('the visitor clicks the {string} switch', (label: string) => {
  consentSwitch(label).click()
})

When('the visitor focuses the {string} switch and presses Space', (label: string) => {
  consentSwitch(label).focus()
  realKey('Space')
})

Then('there is no enabled {string} switch', (label: string) => {
  cy.get('[role="dialog"]').should(($d) => {
    const sw = $d[0].querySelector<HTMLButtonElement>(`[role="switch"][aria-label="${label}"]`)
    expect(!sw || sw.disabled || sw.getAttribute('aria-disabled') === 'true', `${label} switch disabled or absent`).to.eq(true)
  })
})

Given('the browser sends {word} {word} {word}', (a: string, b: string, c: string) => {
  const which = `${a} ${b} ${c}`
  cy.on('window:before:load', (win) => {
    if (which === 'Global Privacy Control') Object.defineProperty(win.navigator, 'globalPrivacyControl', { value: true, configurable: true })
    if (which === 'Do Not Track') Object.defineProperty(win.navigator, 'doNotTrack', { value: '1', configurable: true })
  })
})

Then('{string} is reachable with Tab within {int} presses', (name: string, max: number) => {
  const step = (left: number): void => {
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().then(($f) => {
      if (accName($f[0]) === name) return
      expect(left, `"${name}" reached with Tab`).to.be.greaterThan(0)
      step(left - 1)
    })
  }
  step(max)
})

When('the visitor focuses {string} and presses Enter', (name: string) => {
  byName(name, 'button, a[href]').filter((_, el) => rendered(el)).first().focus()
  realKey('Enter')
})

Then('the {string} and {string} buttons are the same size', (a: string, b: string) => {
  byName(a, 'button').filter((_, el) => rendered(el)).first().then(($a) => {
    byName(b, 'button').filter((_, el) => rendered(el)).first().then(($b) => {
      const ra = $a[0].getBoundingClientRect()
      const rb = $b[0].getBoundingClientRect()
      expect(Math.abs(ra.width - rb.width), `width ${ra.width} vs ${rb.width}`).to.be.at.most(1)
      expect(Math.abs(ra.height - rb.height), `height ${ra.height} vs ${rb.height}`).to.be.at.most(1)
      const sa = getComputedStyle($a[0])
      const sb = getComputedStyle($b[0])
      expect(sa.fontSize, 'font size').to.eq(sb.fontSize)
      expect(sa.fontWeight, 'font weight').to.eq(sb.fontWeight)
    })
  })
})

const recorded = new Set<string>()
Before({ tags: '@consent' }, () => recorded.clear())

When('the visitor records the storage keys', () => {
  cy.wait(400)
  cy.window().then((win) => {
    Object.keys(win.localStorage).forEach((k) => recorded.add(k))
    Object.keys(win.sessionStorage).forEach((k) => recorded.add(k))
  })
})

Then('the storage table on \\/privacy names every recorded key', () => {
  cy.contains('h3', 'Cookies and similar storage').should('exist')
  cy.get('table').then(($t) => {
    const table = Array.from($t).map((t) => t.textContent || '').join(' ')
    const missing = Array.from(recorded).filter((key) => {
      if (table.includes(key)) return false
      const prefix = key.includes(':') ? key.slice(0, key.indexOf(':') + 1) : null
      return !(prefix && table.includes(prefix))
    })
    expect(missing, `keys seen in storage but not in the /privacy table (seen: ${Array.from(recorded).join(', ')})`).to.deep.eq([])
  })
})

Then('the recorded keys include {string}', (keys: string) => {
  cy.wrap(null).then(() => {
    keys.split(', ').forEach((k) => expect(Array.from(recorded), k).to.include(k))
  })
})

// ---------- maintenance / 404 / 500 ----------

Then('the {string} nav links to {string}', (nav: string, hrefs: string) => {
  cy.get(`nav[aria-label="${nav}"]`).should(($n) => {
    const links = Array.from($n[0].querySelectorAll('a[href]')).map((a) => a.getAttribute('href'))
    hrefs.split(', ').forEach((h) => expect(links).to.include(h))
  })
})

Then('the error reference reads {string} followed by the digest', (prefix: string) => {
  cy.contains(new RegExp(`${prefix}\\S+`)).should('be.visible')
})

When('the site mock is healthy again', () => {
  mockReset()
})

Then('the page heading eventually contains {string}', (t: string) => {
  cy.get('h1', { timeout: 20000 }).should(($h) => expect(norm($h[0].innerText)).to.contain(t))
})

export { banner }
