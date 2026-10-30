/// <reference types="cypress" />
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { byName, dataset, mockData, mockSlow, norm, rendered } from '../../../support/frontend/site'

const text = (el: Element) => norm((el as HTMLElement).innerText ?? el.textContent)

function named(name: string) {
  return byName(name, 'button, a[href]').filter((_, el) => rendered(el)).first()
}

Then('the {string} button is {int}px tall', (name: string, px: number) => {
  named(name).should(($b) => expect($b[0].getBoundingClientRect().height).to.be.closeTo(px, 0.5))
})

Then('the {string} button is {int} by {int} px', (name: string, w: number, h: number) => {
  named(name).should(($b) => {
    const r = $b[0].getBoundingClientRect()
    expect(r.width, 'width').to.be.closeTo(w, 0.5)
    expect(r.height, 'height').to.be.closeTo(h, 0.5)
  })
})

Then('the open dialog is at most {int}px wide with a {int}px radius', (max: number, radius: number) => {
  cy.wait(600)
  cy.get('[role="dialog"]').should(($d) => {
    expect($d[0].getBoundingClientRect().width).to.be.at.most(max + 0.5)
    expect(getComputedStyle($d[0]).borderTopLeftRadius).to.eq(`${radius}px`)
  })
})

Then('the {string} nav is {float}px wide against the right edge', (nav: string, px: number) => {
  cy.get(`nav[aria-label="${nav}"]`).should(($n) => {
    const r = $n[0].getBoundingClientRect()
    expect(r.width, 'drawer width').to.be.closeTo(px, 1)
    expect(r.right, 'drawer right edge').to.be.closeTo($n[0].ownerDocument.documentElement.clientWidth, 16)
  })
})

Then('there is no toast', () => {
  cy.get('[role="status"]').should('not.exist')
})

Then('the sticky header background is {string}', (colour: string) => {
  cy.get('header').first().should(($h) => {
    const own = getComputedStyle($h[0]).backgroundColor
    const shell = getComputedStyle($h[0].parentElement as HTMLElement).backgroundColor
    expect([own, shell], 'header or its sticky shell').to.include(colour)
  })
})

Then('the reading progress bar is not shown', () => {
  cy.get('header').first().parent().find('.progress').should(($p) => {
    if ($p.length === 0) return
    const s = getComputedStyle($p[0])
    expect(s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0' || $p[0].getBoundingClientRect().width === 0, 'progress bar hidden').to.eq(true)
  })
})

Given('the site mock answers {string} slowly after {int} ms', (route: string, ms: number) => {
  mockSlow(route, ms)
})

Then('a status region says {string}', (t: string) => {
  cy.get('[role="status"]', { timeout: 3000 }).should(($s) => expect(Array.from($s).map(text).join(' ')).to.contain(t))
})

Then('the page heading eventually is {string}', (t: string) => {
  cy.get('h1', { timeout: 20000 }).should(($h) => expect(text($h[0])).to.eq(t))
})

Then('no hero callout is shown', () => {
  cy.get('.callout').each(($c) => expect(rendered($c[0]), 'callout rendered').to.eq(false))
})

Then('the hero chips are shown', () => {
  cy.get('.stack-chips').should(($c) => expect(rendered($c[0])).to.eq(true)).find('span').should('have.length.gte', 2)
})

Then('the {string} nav is not shown', (nav: string) => {
  cy.get('body').should(($b) => {
    const n = $b[0].querySelector(`nav[aria-label="${nav}"]`)
    expect(!n || !rendered(n), `${nav} hidden`).to.eq(true)
  })
})

Then('the dialog does not show {string}', (t: string) => {
  cy.get('[role="dialog"]').should(($d) => expect(text($d[0])).not.to.contain(t))
})

Then('there is no search box', () => {
  cy.get('body').should(($b) => {
    const boxes = $b[0].querySelectorAll('input[type="search"], [role="searchbox"], input[placeholder*="earch"]')
    expect(boxes.length).to.eq(0)
  })
})

When('the visitor removes navigator.share', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'share', { value: undefined, configurable: true })
  })
})

When('the visitor stubs navigator.share', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'share', { value: () => Promise.resolve(), configurable: true, writable: true })
    cy.stub(win.navigator, 'share').resolves().as('share')
  })
})

Then('navigator.share was called with the post URL {string}', (url: string) => {
  cy.get('@share').should('have.been.calledWithMatch', { url: url.replace('SITE', String(Cypress.config('baseUrl'))) })
})

Then('the CV skills list {string} as {string}', (category: string, names: string) => {
  cy.get('dl dt').filter((_, el) => text(el) === category).should('have.length', 1).then(($dt) => {
    const dd = $dt[0].nextElementSibling as HTMLElement
    expect(dd.tagName).to.eq('DD')
    names.split(', ').forEach((n) => expect(text(dd)).to.contain(n))
  })
})

Given('the CV mock contact location is empty', () => {
  dataset().then((d) => {
    d.cv.profile.contact.location = ''
    mockData('cv', d.cv)
  })
})

function sheets() {
  return cy.get('article[aria-label^="CV page"], .cv-sheet-1, .cv-sheet-2').then(($a) => Cypress.$(Array.from(new Set(Array.from($a)))))
}

Then('there are {int} CV sheets of {int} by {int} px', (n: number, w: number, h: number) => {
  sheets().should(($s) => {
    expect($s.length).to.eq(n)
    Array.from($s).forEach((s) => {
      const r = s.getBoundingClientRect()
      expect(r.width, 'sheet width').to.be.closeTo(w, 1)
      expect(r.height, 'sheet height').to.be.closeTo(h, 1)
    })
  })
})

Then('the {string} heading is on the second sheet', (heading: string) => {
  sheets().should(($s) => {
    const second = $s[1]
    const h = Array.from(second.querySelectorAll('h2')).find((x) => text(x) === heading)
    expect(h, `${heading} in sheet 2`).to.exist
  })
})

Then('a request to {string} answers status {int}', (path: string, status: number) => {
  cy.request({ url: path, failOnStatusCode: false }).its('status').should('eq', status)
})

Then('a request to {string} redirects with a 3xx to {string}', (path: string, target: string) => {
  cy.request({ url: path, followRedirect: false, failOnStatusCode: false }).then((res) => {
    expect(res.status).to.be.within(300, 308)
    expect(String(res.headers.location)).to.match(new RegExp(`${target.replace(/\//g, '\\/')}$`))
  })
})

Then('the hero illustration is at least {int}px wide and tall', (px: number) => {
  cy.get('[role="img"]').filter((_, el) => (el.getAttribute('aria-label') || '').includes('interface, API and database')).first().should(($i) => {
    const r = $i[0].getBoundingClientRect()
    expect(r.width, 'width').to.be.gte(px)
    expect(r.height, 'height').to.be.gte(px)
  })
})

// ---- loader race diagnosis (F-9) ----
Given('the browser holds route prefetches of {string} for {int} ms', (path: string, ms: number) => {
  cy.intercept({ method: 'GET', pathname: path }, (req) => {
    const prefetch = Boolean(req.headers['next-router-prefetch'] || req.headers['next-router-segment-prefetch'])
    if (prefetch) req.on('response', (res) => res.setDelay(ms))
  }).as('rscPrefetch')
})

When('the visitor waits until the route {string} has been prefetched', (path: string) => {
  cy.intercept({ method: 'GET', pathname: path, headers: { 'next-router-prefetch': '1' } }).as('donePrefetch')
  cy.get('footer').scrollIntoView()
  cy.wait('@donePrefetch', { timeout: 10000 })
  cy.wait(300)
})

Then('the main landmark is never empty while {string} loads', (path: string) => {
  cy.location('pathname', { timeout: 3000 }).should('eq', path)
  cy.get('main', { timeout: 3000 }).should(($m) => {
    const html = $m[0].innerHTML
    expect($m[0].querySelector('[role="status"]'), `loader in main; main has ${$m[0].children.length} children, html: ${html.slice(0, 300)}`).to.exist
  })
})
