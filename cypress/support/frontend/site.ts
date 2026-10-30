/// <reference types="cypress" />
/**
 * Helpers for the frontend acceptance specs (cypress/e2e/frontend/*.feature).
 * The mock API (cypress/support/frontend/mock-api.mjs) must be running on MOCK_API
 * and the site built with NEXT_PUBLIC_API_URL=MOCK_API.
 */
export const MOCK_API = 'http://localhost:4010'

export const VIEWPORTS = {
  desktop: [1440, 900] as const,
  phone: [390, 844] as const,
}

export function mockReset() {
  return cy.request('POST', `${MOCK_API}/__mock/reset`)
}

export function mockData(key: string, value: unknown) {
  return cy.request('POST', `${MOCK_API}/__mock/state`, { data: { [key]: value } })
}

export function mockRoute(route: string, status: number, body?: unknown, delay = 0) {
  return cy.request('POST', `${MOCK_API}/__mock/state`, {
    routes: { [route]: { status, body: body ?? { success: false, error: 'Internal server error' }, delay } },
  })
}

/** Answer a route normally, but only after `delay` ms (cold-start simulation). */
export function mockSlow(route: string, delay: number) {
  return cy.request('POST', `${MOCK_API}/__mock/state`, { routes: { [route]: { passthrough: true, delay } } })
}

export function mockRequests() {
  return cy.request(`${MOCK_API}/__mock/requests`).its('body')
}

/** Current default dataset (fresh copy). */
export function dataset(): Cypress.Chainable<Record<string, any>> {
  return cy.fixture('frontend/dataset.json').then((d) => JSON.parse(JSON.stringify(d)))
}

export const norm = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim()

/** Accessible name, close enough for links, buttons, dialogs and nav landmarks. */
export function accName(el: Element): string {
  const label = el.getAttribute('aria-label')
  if (label) return norm(label)
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    return norm(
      by
        .split(/\s+/)
        .map((id) => el.ownerDocument.getElementById(id)?.textContent || '')
        .join(' ')
    )
  }
  return norm((el as HTMLElement).innerText ?? el.textContent)
}

const CLICKABLE = 'a[href], button, [role="button"], [role="tab"]'

/** Visible links/buttons whose accessible name equals `name`. */
export function byName(name: string, selector = CLICKABLE, within?: string) {
  const base = within ? cy.get(within).find(selector) : cy.get(selector)
  return base.filter((_, el) => accName(el) === norm(name))
}

export function dialogNamed(name: string) {
  return cy.get('[role="dialog"]').filter((_, el) => accName(el) === norm(name))
}

export function setReducedMotion(on: boolean) {
  return cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }] },
    }),
    { log: false }
  )
}

export function setPrintMedia(on: boolean) {
  return cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: on ? 'print' : '' },
    }),
    { log: false }
  )
}

/** Visible text of the page body, whitespace normalised. */
export function bodyText() {
  return cy.document().then((doc) => norm(doc.body.innerText))
}

/** Laid out on the page (not display:none / visibility:hidden). Scroll reveals may still have opacity 0. */
export function rendered(el: Element): boolean {
  if (el.getClientRects().length === 0) return false
  const style = getComputedStyle(el)
  return style.visibility !== 'hidden'
}
