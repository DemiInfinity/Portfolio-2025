/// <reference types="cypress" />
import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import {
  VIEWPORTS,
  accName,
  bodyText,
  byName,
  dataset,
  dialogNamed,
  mockData,
  mockReset,
  mockRoute,
  mockRequests,
  norm,
  setPrintMedia,
  setReducedMotion,
  rendered,
} from '../../../support/frontend/site'

// Steps for cypress/e2e/frontend/*.feature. Every step starts with "the visitor", "the site",
// "the page" or another phrase the older "I ..." steps don't use, so the global step registry
// stays unambiguous.

let flags: Record<string, boolean> = {}

Before({ tags: '@site' }, () => {
  mockReset()
  dataset().then((d) => {
    flags = { ...d.flags }
  })
  setReducedMotion(false)
  setPrintMedia(false)
  cy.viewport(...VIEWPORTS.desktop)
  // Pass-through spies for the client-side checks (the mock answers them).
  cy.intercept('GET', '**/api/feature-flags/public/*').as('flagCheck')
  cy.intercept('GET', '**/api/upload/resume').as('resume')
  // The shared support file stubs maintenance as off; keep that unless a step turns it on.
})

/** Wait until React has hydrated the page (SSR markup has no fibre keys). */
export function waitForHydration() {
  cy.document({ log: false }).its('readyState').should('eq', 'complete')
  cy.get('body', { log: false }).should(($b) => {
    const el = $b[0].querySelector('h1') || $b[0].querySelector('main') || $b[0].firstElementChild
    expect(el, 'hydrated element').to.exist
    expect(Object.keys(el as Element).some((k) => k.startsWith('__react')), 'React hydrated').to.eq(true)
  })
}

// ---------- setup ----------

Given('the visitor uses a {word} screen', (screen: string) => {
  const size = screen === 'phone' ? VIEWPORTS.phone : VIEWPORTS.desktop
  cy.viewport(size[0], size[1])
})

Given('the visitor prefers reduced motion', () => {
  setReducedMotion(true)
})

Given('the page uses print media', () => {
  setPrintMedia(true)
})

Given('the site flag {string} is {word}', (name: string, state: string) => {
  flags = { ...flags, [name]: state === 'on' }
  mockData('flags', flags)
})

Given('maintenance mode is on', () => {
  flags = { ...flags, maintenance_mode: true }
  mockData('flags', flags)
  cy.intercept('GET', '**/api/feature-flags/maintenance', { statusCode: 200, body: { success: true, maintenance_mode: true } })
})

Given('the browser flag check for {string} takes {int} ms', (name: string, ms: number) => {
  cy.intercept('GET', `**/api/feature-flags/public/${name}`, (req) => {
    req.reply({ statusCode: 200, body: { success: true, enabled: Boolean(flags[name]) }, delay: ms })
  }).as('slowFlag')
})

Given('the site resume is available at {string}', (url: string) => {
  mockData('resume', { available: true, url, path: 'site/cv/Demi-Taylor-Nimmo-CV.pdf', name: 'Demi-Taylor-Nimmo-CV.pdf', size: 1000, updatedAt: '2026-10-20T10:00:00.000Z' })
})

Given('the site resume is unavailable', () => {
  mockData('resume', { available: false, url: null })
})

Given('the site mock {string} is:', (key: string, json: string) => {
  mockData(key, JSON.parse(json))
})

Given('the site mock {string} is the fixture {string}', (key: string, file: string) => {
  cy.fixture(`frontend/${file}`).then((value) => mockData(key, value))
})

Given('the site mock answers {string} with status {int}', (route: string, status: number) => {
  mockRoute(route, status, status === 404 ? { success: false, error: 'Route not found' } : undefined)
})

Given('the visitor watches analytics requests', () => {
  cy.intercept('POST', '**/api/analytics/track', { statusCode: 200, body: { success: true } }).as('track')
})

Given('the visitor records font stylesheet requests', () => {
  cy.intercept('**/fonts.googleapis.com/**').as('googleFonts')
})

// ---------- actions ----------

When('the visitor opens {string}', (path: string) => {
  cy.visit(path, { failOnStatusCode: false })
  waitForHydration()
})

When('the visitor reloads the page', () => {
  cy.reload()
  waitForHydration()
})

When('the visitor waits {int} ms', (ms: number) => {
  cy.wait(ms)
})

When('the visitor waits for the flag check', () => {
  cy.wait('@flagCheck')
  cy.wait(300)
})

When('the visitor waits for the resume check', () => {
  cy.wait('@resume')
  cy.wait(300)
})

When('the visitor clicks {string}', (name: string) => {
  byName(name).filter((_, el) => rendered(el)).first().scrollIntoView().click()
})

When('the visitor clicks {string} in the {string} nav', (name: string, nav: string) => {
  byName(name, 'a[href], button', `nav[aria-label="${nav}"]`).filter((_, el) => rendered(el)).first().scrollIntoView().click()
})

When('the visitor clicks {string} in the {string} section', (name: string, section: string) => {
  byName(name, 'a[href], button', section).filter((_, el) => rendered(el)).first().scrollIntoView().click()
})

const KEYS: Record<string, string> = {
  Tab: Cypress.Keyboard.Keys.TAB,
  Enter: Cypress.Keyboard.Keys.ENTER,
  Escape: Cypress.Keyboard.Keys.ESC,
  ArrowRight: Cypress.Keyboard.Keys.RIGHT,
  ArrowLeft: Cypress.Keyboard.Keys.LEFT,
}

When('the visitor presses {word} {int} times', (key: string, times: number) => {
  for (let i = 0; i < times; i += 1) cy.press(KEYS[key] as any)
})

When('the visitor scrolls to {int} pixels', (y: number) => {
  cy.scrollTo(0, y, { ensureScrollable: false })
  cy.wait(300)
})

When('the visitor clicks the overlay backdrop', () => {
  cy.get('[data-testid="overlay-backdrop"], .ov-backdrop').first().click(5, 5, { force: true })
})

// ---------- generic assertions ----------

Then('the page heading is {string}', (text: string) => {
  cy.get('h1').first().should(($h) => expect(norm($h[0].innerText)).to.eq(text))
})

Then('the page heading contains {string}', (text: string) => {
  cy.get('h1').first().should(($h) => expect(norm($h[0].innerText)).to.contain(text))
})

Then('the document title is {string}', (title: string) => {
  cy.title().should('eq', title)
})

Then('the visitor sees {string}', (text: string) => {
  cy.contains(text, { matchCase: true }).scrollIntoView().should('be.visible')
})

Then('the page does not show {string}', (text: string) => {
  cy.get('body').should(($b) => expect(norm($b[0].innerText)).not.to.contain(text))
})

Then('the URL path is {string}', (path: string) => {
  cy.location('pathname').should('eq', path)
})

Then('the {string} button is visible', (name: string) => {
  byName(name, 'button, a[href]').filter((_, el) => rendered(el)).should('have.length.gte', 1)
})

function countNamed(selector: string, name: string, onlyVisible = true) {
  return cy.get('body').then(($b) =>
    Array.from($b[0].querySelectorAll(selector)).filter(
      (el) => accName(el) === norm(name) && (!onlyVisible || Cypress.dom.isVisible(el))
    ).length
  )
}

Then('there is no {string} button', (name: string) => {
  cy.get('body').should(($b) => {
    const n = Array.from($b[0].querySelectorAll('button')).filter((el) => accName(el) === norm(name)).length
    expect(n, `buttons named "${name}"`).to.eq(0)
  })
})

Then('the {string} button has aria-expanded {string}', (name: string, value: string) => {
  byName(name, 'button').should('have.attr', 'aria-expanded', value)
})

Then('there is a heading {string}', (text: string) => {
  cy.get('h1, h2, h3').filter((_, el) => norm((el as HTMLElement).innerText) === text).should('have.length.gte', 1)
})

Then('there is no heading {string}', (text: string) => {
  cy.get('body').should(($b) => {
    const n = Array.from($b[0].querySelectorAll('h1, h2, h3')).filter((el) => norm((el as HTMLElement).innerText) === text).length
    expect(n, `headings "${text}"`).to.eq(0)
  })
})

Then('the page has a link {string} to {string}', (name: string, href: string) => {
  cy.get(`a[href="${href}"]`).filter((_, el) => accName(el) === norm(name)).should('have.length.gte', 1)
})

Then('the page has a link containing {string} to {string}', (text: string, href: string) => {
  cy.get(`a[href="${href}"]`).filter((_, el) => accName(el).includes(text)).should('have.length.gte', 1)
})

Then('the page has a link to {string}', (href: string) => {
  cy.get(`main a[href="${href}"], a[href="${href}"]`).should('have.length.gte', 1)
})

Then('the {string} link points to {string} with a download attribute', (name: string, href: string) => {
  byName(name, 'a').filter((_, el) => rendered(el)).should('have.length', 1).and('have.attr', 'href', href).and('have.attr', 'download')
})

Then('the toast says {string}', (text: string) => {
  cy.get('[role="status"]').filter((_, el) => norm((el as HTMLElement).innerText).includes(text)).should('have.length', 1)
})

Then('a blockquote contains {string}', (text: string) => {
  cy.get('blockquote').filter((_, el) => norm((el as HTMLElement).innerText).includes(text)).should('have.length.gte', 1)
})

Then('a {string} element contains {string}', (selector: string, text: string) => {
  cy.get(selector).filter((_, el) => (el.textContent || '').includes(text)).should('have.length.gte', 1)
})

Then('the canonical link ends with {string}', (path: string) => {
  cy.get('link[rel="canonical"]').should('have.attr', 'href').and('match', new RegExp(`${path.replace(/[/.]/g, '\\$&')}$`))
})

Then('the page has JSON-LD of type {string}', (type: string) => {
  cy.get('script[type="application/ld+json"]').should(($s) => {
    const types = Array.from($s).map((s) => JSON.parse(s.textContent || '{}')['@type'])
    expect(types).to.include(type)
  })
})

Then('the meta {string} contains {string}', (name: string, text: string) => {
  cy.get(`meta[property="${name}"], meta[name="${name}"]`).first().should('have.attr', 'content').and('contain', text)
})

Then('the meta {string} is {string}', (name: string, value: string) => {
  cy.get(`meta[property="${name}"], meta[name="${name}"]`).first().should('have.attr', 'content', value)
})

Then('the visitor sees the not-found page with a link home', () => {
  cy.get('h1').should('have.length', 1)
  cy.get('a[href="/"]').filter(':visible').filter((_, el) => /home/i.test(accName(el))).should('have.length.gte', 1)
  bodyText().should('match', /(doesn.t exist|not found|can.t find|couldn.t find)/i)
})

Then('there is a section with id {string}', (id: string) => {
  cy.get(`#${id}`).should('exist')
})

Then('the page has exactly one h1', () => {
  cy.get('h1').should('have.length', 1)
})

Then('the page text has no emoji', () => {
  // © ® ™ are Extended_Pictographic in Unicode but render as text; they are not emoji.
  bodyText().then((text) => {
    const hits = Array.from(text.replace(/[©®™]/g, '')).filter((ch) => /\p{Extended_Pictographic}/u.test(ch))
    expect(hits, 'emoji characters in the page text').to.deep.eq([])
  })
})

Then('the page has no sideways scroll', () => {
  cy.wait(300)
  cy.window().then((win) => {
    const doc = win.document.documentElement
    win.scrollTo(200, win.scrollY)
    const scrolledX = win.scrollX
    win.scrollTo(0, win.scrollY)
    const wide = Array.from(win.document.body.querySelectorAll<HTMLElement>('*'))
      .filter((el) => el.getBoundingClientRect().right > win.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80))
    cy.log(`scrollWidth ${doc.scrollWidth}, scrollX after scrollTo(200) ${scrolledX}, wide: ${wide.join(' | ')}`)
    expect(scrolledX, `the page cannot be scrolled sideways (overflowing: ${wide.join(' | ')})`).to.eq(0)
    // Plan definition (plan-frontend.md "Tests"): scrollWidth <= innerWidth.
    expect(doc.scrollWidth, `scrollWidth <= innerWidth ${win.innerWidth}; overflowing: ${wide.join(' | ')}`).to.be.at.most(win.innerWidth)
  })
})

Then('localStorage {string} is {string}', (key: string, value: string) => {
  cy.window().its('localStorage').invoke('getItem', key).should('eq', value)
})

// ---------- dialogs and focus ----------

Then('the dialog {string} is open', (name: string) => {
  dialogNamed(name).should('have.length', 1).and('have.attr', 'aria-modal', 'true')
})

Then('no dialog is open', () => {
  cy.get('[role="dialog"]').should('not.exist')
})

Then('the dialog shows {string}', (text: string) => {
  cy.get('[role="dialog"]').should(($d) => expect(norm($d[0].innerText)).to.contain(text))
})

Then('focus is inside the open dialog', () => {
  cy.focused().should(($f) => expect($f[0].closest('[role="dialog"]'), 'focused element inside the dialog').to.exist)
})

Then('focus is inside the {string} nav', (nav: string) => {
  cy.focused().should(($f) => expect($f[0].closest(`nav[aria-label="${nav}"]`), `focus inside nav ${nav}`).to.exist)
})

Then('the focused element is {string}', (name: string) => {
  cy.focused().should(($f) => expect(accName($f[0])).to.eq(name))
})

Then('the focused element is the main landmark', () => {
  cy.focused().should('match', 'main')
})

Then('the focused element has a solid 3px outline', () => {
  cy.focused().should('have.css', 'outline-style', 'solid').and('have.css', 'outline-width', '3px')
})

function shiftTab() {
  const send = (type: string) =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Input.dispatchKeyEvent',
      params: { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 },
    })
  return cy.wrap(send('rawKeyDown').then(() => send('keyUp')), { log: false })
}

function stayInside(container: string, presses: number, shift: boolean) {
  for (let i = 0; i < presses; i += 1) {
    if (shift) shiftTab()
    else cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should(($f) => expect($f[0].closest(container), `press ${i + 1}: focus inside ${container}`).to.exist)
  }
}

Then('focus stays inside the dialog for {int} presses of Tab', (n: number) => stayInside('[role="dialog"]', n, false))
Then('focus stays inside the dialog for {int} presses of Shift+Tab', (n: number) => stayInside('[role="dialog"]', n, true))
Then('focus stays inside the {string} nav for {int} presses of Tab', (nav: string, n: number) =>
  stayInside(`nav[aria-label="${nav}"]`, n, false)
)

When('the visitor clicks inside the dialog', () => {
  cy.get('[role="dialog"] h2').first().click()
})

Then('the page body does not scroll', () => {
  cy.get('body').should('have.css', 'overflow', 'hidden')
})

Then('the page body can scroll', () => {
  cy.get('body').should(($b) => expect(getComputedStyle($b[0]).overflow).not.to.eq('hidden'))
})

// ---------- navs, header, footer ----------

function navPageLinks(nav: string) {
  return cy
    .get(`nav[aria-label="${nav}"]`)
    .find('a[href^="/"]')
    .filter((_, el) => !el.getAttribute('aria-label'))
}

Then('the {string} nav links are {string}', (nav: string, list: string) => {
  navPageLinks(nav).should(($a) => expect(Array.from($a).map((a) => accName(a))).to.deep.eq(list.split(', ')))
})

Then('in the {string} nav only {string} has aria-current {string}', (nav: string, name: string, value: string) => {
  navPageLinks(nav).should(($a) => {
    const current = Array.from($a).filter((a) => a.getAttribute('aria-current') === value).map((a) => accName(a))
    expect(current).to.deep.eq([name])
  })
})

Then('the {string} nav text links are hidden', (nav: string) => {
  navPageLinks(nav).should('have.length', 5).each(($a) => expect(Cypress.dom.isVisible($a[0]), accName($a[0])).to.eq(false))
})

Then('there is no {string} nav', (nav: string) => {
  cy.get(`nav[aria-label="${nav}"]`).should('not.exist')
})

Then('there is no site footer', () => {
  // The CV sheet has its own page footers (footer.cv-foot); the site footer is the one with nav "Footer".
  cy.get('nav[aria-label="Footer"]').should('not.exist')
  cy.get('footer.site-footer').should('not.exist')
})

Then('the site header is pinned to the top of the viewport', () => {
  cy.get('header').first().should(($h) => {
    const r = $h[0].getBoundingClientRect()
    expect(r.top, 'header top').to.be.within(-1, 30)
    expect(r.bottom, 'header bottom').to.be.greaterThan(20)
  })
  cy.window().its('scrollY').should('be.gte', 1400)
})

Then('the footer links to {string}', (list: string) => {
  cy.get('footer').within(() => {
    list.split(', ').forEach((href) => cy.get(`a[href="${href}"]`).should('have.length.gte', 1))
  })
})

Then('the footer has no link to {string}', (href: string) => {
  cy.get('footer').find(`a[href="${href}"]`).should('not.exist')
})

// ---------- sitemap ----------

function sitemap() {
  return cy.request('/sitemap.xml').its('body')
}

Then('the sitemap lists {string}', (list: string) => {
  sitemap().then((xml: string) => {
    list.split(', ').forEach((p) => expect(xml, p).to.contain(`<loc>${Cypress.config("baseUrl")}${p}</loc>`))
  })
})

Then('the sitemap does not list {string}', (list: string) => {
  sitemap().then((xml: string) => {
    list.split(', ').forEach((p) => expect(xml, p).not.to.contain(`<loc>${Cypress.config("baseUrl")}${p}</loc>`))
  })
})

// ---------- fonts and motion ----------

function fontFamilyOf(selector: string) {
  return cy.get(selector).first().then(($el) => getComputedStyle($el[0]).fontFamily)
}

Then('the hero serif heading uses the self-hosted Playfair family', () => {
  fontFamilyOf('h1 .serif').should('match', /Playfair/i)
  cy.document().then((doc) => doc.fonts.ready).then(() => {
    cy.document().should((doc) => {
      const faces = Array.from(doc.fonts).filter((f) => /Playfair/i.test(f.family) && f.status === 'loaded')
      expect(faces.length, 'a loaded Playfair face').to.be.greaterThan(0)
    })
  })
})

Then('the body uses the self-hosted Poppins family', () => {
  fontFamilyOf('body').should('match', /Poppins/i)
})

Then('no request went to {string}', (host: string) => {
  cy.wait(500)
  cy.get('@googleFonts.all').should('have.length', 0)
  cy.document().then((doc) => {
    const links = Array.from(doc.querySelectorAll('link[href]')).map((l) => l.getAttribute('href') || '')
    expect(links.filter((h) => h.includes(host))).to.deep.eq([])
  })
})

Then('every {string} element has animation-name {string}', (selector: string, value: string) => {
  cy.get(selector).should('have.length.gte', 1).each(($el) => expect(getComputedStyle($el[0]).animationName).to.eq(value))
})

// ---------- analytics, maintenance, mock log ----------

Then('no analytics request was sent', () => {
  cy.get('@track.all').should('have.length', 0)
  mockRequests().then((log: any[]) => {
    expect(log.filter((r) => r.method === 'POST' && r.path === '/api/analytics/track')).to.have.length(0)
  })
})

Then('at least one analytics request was sent', () => {
  cy.wait('@track')
})

Then('the visitor sees the maintenance page', () => {
  cy.contains('h1', 'Under Maintenance').should('be.visible')
})

Then('the mock API saw {string} with {string}', (route: string, search: string) => {
  const [method, path] = route.split(' ')
  mockRequests().then((log: any[]) => {
    expect(log.filter((r) => r.method === method && r.path === path).map((r) => r.search)).to.include(search)
  })
})

// ---------- screenshots ----------

Then('a full-page screenshot {string} is saved', (name: string) => {
  cy.screenshot(`frontend/${name}`, { capture: 'fullPage', overwrite: true })
})

Then('a viewport screenshot {string} is saved', (name: string) => {
  cy.screenshot(`frontend/${name}`, { capture: 'viewport', overwrite: true })
})

export { countNamed }
