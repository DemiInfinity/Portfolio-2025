/// <reference types="cypress" />
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { norm, rendered } from '../../../support/frontend/site'

const site = () => String(Cypress.config('baseUrl')).replace(/\/$/, '')
const expand = (s: string) => s.replace('SITE_ENC', encodeURIComponent(site())).replace('SITE', site())

function shareButtons() {
  return cy.get('button[aria-haspopup="menu"]').filter((_, el) => rendered(el) && /Share/.test(norm(el.textContent)))
}

function menu() {
  return cy.get('[role="menu"]')
}

/** The item's own name: the first line of its text (posts add a helper line under it). */
const ITEM_NAMES = ['LinkedIn', 'Email', 'Copy link', 'More options']
function itemName(el: Element) {
  const t = norm(el.textContent)
  return ITEM_NAMES.find((n) => t.startsWith(n)) ?? t
}

function item(name: string) {
  return menu().find('[role="menuitem"]').filter((_, el) => itemName(el) === name)
}

function realKey(key: 'Enter' | 'Space') {
  const params =
    key === 'Enter'
      ? { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }
      : { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ' }
  const send = (type: string, extra: object = {}) =>
    Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { type, ...params, ...extra } })
  return cy.wrap(send('keyDown').then(() => send('keyUp', { text: undefined, unmodifiedText: undefined })), { log: false })
}

const KEYS: Record<string, string> = {
  ArrowDown: Cypress.Keyboard.Keys.DOWN,
  ArrowUp: Cypress.Keyboard.Keys.UP,
  Home: Cypress.Keyboard.Keys.HOME,
  End: Cypress.Keyboard.Keys.END,
  Escape: Cypress.Keyboard.Keys.ESC,
  Tab: Cypress.Keyboard.Keys.TAB,
}

When('the visitor opens the share menu {string}', (label: string) => {
  // Keep the button clear of the sticky site header so the menu isn't measured under it.
  shareButtons().first().scrollIntoView({ offset: { top: -200, left: 0 } }).click()
  cy.get(`[role="menu"][aria-label="${label}"]`).should('be.visible')
})

When('the visitor chooses {string} in the share menu', (name: string) => {
  item(name).first().click({ scrollBehavior: 'center' })
})

Then('the share menu items are {string}', (names: string) => {
  menu().find('[role="menuitem"]').should(($i) => expect(Array.from($i).map(itemName)).to.deep.eq(names.split(', ')))
})

Then('the share item {string} links to the LinkedIn share URL for {string}', (name: string, url: string) => {
  item(name).should('have.attr', 'href', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(expand(url))}`)
})

Then('the share item {string} is a mailto with subject {string} and body {string}', (name: string, subject: string, body: string) => {
  item(name).should('have.attr', 'href', `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(expand(body))}`)
})

Then('the share item {string} opens in a new tab safely', (name: string) => {
  item(name).should('have.attr', 'target', '_blank').and(($a) => {
    const rel = $a.attr('rel') || ''
    expect(rel).to.contain('noopener')
    expect(rel).to.contain('noreferrer')
  })
})

Given('the clipboard API rejects', () => {
  cy.window().then((win) => {
    if (!win.navigator.clipboard) {
      Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true })
    } else {
      cy.stub(win.navigator.clipboard, 'writeText').rejects(new Error('blocked'))
    }
  })
})

Then('a toast is shown', () => {
  cy.get('[role="status"]').filter((_, el) => /Link copied|Couldn.t copy/.test(norm(el.textContent))).should('have.length', 1)
})

When('the visitor focuses the first Share button and presses {string}', (key: string) => {
  shareButtons().first().scrollIntoView({ offset: { top: -200, left: 0 } }).focus()
  if (key === 'Enter' || key === 'Space') realKey(key)
  else cy.press(KEYS[key] as any)
})

When('the visitor presses the key {string}', (key: string) => {
  cy.press(KEYS[key] as any)
})

Then('the share menu is open and {string} has focus', (name: string) => {
  menu().should('be.visible')
  cy.focused().should(($f) => expect(itemName($f[0])).to.eq(name))
})

Then('the share item {string} has focus', (name: string) => {
  cy.focused().should(($f) => {
    expect($f[0].getAttribute('role')).to.eq('menuitem')
    expect(itemName($f[0])).to.eq(name)
  })
})

Then('the share menu is closed', () => {
  cy.get('[role="menu"]').should('not.exist')
})

Then('the first Share button has focus with aria-expanded {string}', (value: string) => {
  cy.focused().should('have.attr', 'aria-haspopup', 'menu').and('have.attr', 'aria-expanded', value)
})

When('the visitor clicks the page heading', () => {
  cy.get('h1').first().click()
})

Then('the open share menu is inside the viewport with at least {int}px margin', (px: number) => {
  cy.wait(600)
  menu().should(($m) => {
    const r = $m[0].getBoundingClientRect()
    const w = $m[0].ownerDocument.documentElement.clientWidth
    expect(r.left, 'left margin').to.be.gte(px)
    expect(w - r.right, 'right margin').to.be.gte(px)
  })
})

Then('every share menu item is the top element at its centre', () => {
  cy.wait(700)
  menu().find('[role="menuitem"]').each(($i) => {
    const el = $i[0]
    const r = el.getBoundingClientRect()
    const top = el.ownerDocument.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    const desc = top ? `${top.tagName.toLowerCase()}.${(top as HTMLElement).className} "${norm(top.textContent).slice(0, 40)}"` : 'nothing'
    expect(Boolean(top && (top === el || el.contains(top))), `"${itemName(el)}" is covered by ${desc} (item at y=${Math.round(r.top)})`).to.eq(true)
  })
})
