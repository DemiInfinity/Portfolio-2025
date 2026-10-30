/// <reference types="cypress" />
import { Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { exact, norm, visitAdmin } from './helpers'

const PAGES = ['/', '/about', '/projects', '/blog', '/work-history', '/education', '/certifications', '/learning', '/analytics', '/feature-flags', '/settings']

Then('the admin sees that the app root has the class {string}', (cls: string) => {
  cy.get('#root > *').first().should('have.class', cls)
})

Then('the admin sees that the body background is {string} and the font starts with {string}', (bg: string, font: string) => {
  cy.get('body').should('have.css', 'background-color', bg)
  cy.get('.ad').first().then(($r) => {
    const ff = getComputedStyle($r[0]).fontFamily
    expect(ff.replace(/["']/g, '').trim()).to.match(new RegExp('^' + font))
  })
})

Then('no page in the admin shows an emoji', () => {
  PAGES.forEach((p) => {
    visitAdmin(p)
    cy.get('main h1', { timeout: 15000 }).should('be.visible')
    cy.wait(300)
    cy.get('body').then(($b) => {
      const text = $b[0].innerText + ' ' + $b[0].ownerDocument.title
      const hits = text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/gu)
      expect(hits, `emoji on ${p}: ${(hits || []).join(' ')}`).to.eq(null)
    })
  })
})

Then('the admin sees that the sidebar links read {string}', (list: string) => {
  cy.get('nav.ad-side').should('be.visible').find('a.ad-link').should(($a) => {
    expect($a.toArray().map((a) => norm(a.textContent || ''))).to.deep.eq(list.split(', '))
  })
})

Then('the admin sees that the sidebar groups read {string}', (list: string) => {
  cy.get('nav.ad-side .ad-group').should(($g) => {
    expect($g.toArray().map((g) => norm(g.textContent || ''))).to.deep.eq(list.split(', '))
  })
  // Content holds About..Learning, Site holds Analytics..Settings
  cy.get('nav.ad-side').then(($n) => {
    const kids = $n.children().toArray()
    const at = (t: string) => kids.findIndex((k) => norm(k.textContent || '') === t)
    expect(at('Content')).to.be.lessThan(at('About'))
    expect(at('Learning')).to.be.lessThan(at('Site'))
    expect(at('Site')).to.be.lessThan(at('Analytics'))
  })
})

Then('the admin sees that only the sidebar link {string} is the current page', (label: string) => {
  cy.get('nav.ad-side a[aria-current="page"]').should('have.length', 1).and(($a) => expect(norm($a.text())).to.eq(label))
})

Then('the admin sees that the sign-in screen shows', () => {
  cy.contains('h1, h2', exact('Sign in')).should('be.visible')
  cy.get('input[type="email"]').should('be.visible')
})

Then('the admin sees that the top bar status reads {string}', (s: string) => {
  cy.get('.ad-top').contains(exact(s)).should('be.visible')
})

Then('the admin sees that the sidebar is not visible', () => {
  cy.get('nav.ad-side').should('not.be.visible')
  cy.get('.ad-top').should('not.be.visible')
})

Then('the admin sees that the {string} sheet shows {int} links', (name: string, n: number) => {
  cy.get(`[role="dialog"][aria-label="${name}"]`).should('be.visible').within(() => {
    cy.get('nav a').should('have.length', n)
    cy.contains('a', 'View site').should('be.visible')
    cy.contains('button', 'Sign out').should('be.visible')
  })
  cy.focused().should('have.attr', 'aria-label').and('match', /^Close/)
})

Then('the admin sees that the {string} button is expanded', (name: string) => {
  cy.get(`button[aria-label="${name}"]`).should('have.attr', 'aria-expanded', 'true')
})

When('the admin clicks the sheet link {string}', (label: string) => {
  cy.get('[role="dialog"][aria-label="Admin menu"]').contains('a', exact(label)).click()
})

Then('the admin sees that the {string} sheet is closed', (name: string) => {
  cy.get(`[role="dialog"][aria-label="${name}"]`).should('not.exist')
  cy.focused().should('have.attr', 'aria-label', 'Open menu')
})

When('the admin types {string} into the top search at {int} ms a key', (text: string, ms: number) => {
  cy.get('form[role="search"] input').filter(':visible').first().clear().type(text, { delay: ms })
})

When('the admin types {string} into the {string} box at {int} ms a key', (text: string, label: string, ms: number) => {
  cy.contains('label', label).invoke('attr', 'for').then((id) => cy.get(`[id="${id}"]`).clear().type(text, { delay: ms }))
})

Then('the admin sees a control named {string}', (name: string) => {
  cy.get(`[aria-label="${name}"]`).filter('button, [role="tab"]').should('have.length.at.least', 1)
})
