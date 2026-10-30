/// <reference types="cypress" />
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { accName, byName, norm } from '../../../support/frontend/site'

// Hire me modal (F-6): the browser posts to the mock API origin, so cy.intercept stubs it.

const CONTRACT = {
  201: { success: true, data: { id: 1, received_at: '2026-10-30T10:00:00.000Z' } },
  200: { success: true },
  429: { success: false, error: 'Too many messages. Please try again later.' },
  500: { success: false, error: 'Internal server error' },
} as Record<number, unknown>

Given('the contact endpoint answers {word}', (status: string) => {
  if (status === 'network') {
    cy.intercept('POST', '**/api/contact', { forceNetworkError: true }).as('contact')
    return
  }
  const code = Number(status)
  cy.intercept('POST', '**/api/contact', { statusCode: code, body: CONTRACT[code] }).as('contact')
})

Given('the contact endpoint answers {int} after {int} ms', (code: number, ms: number) => {
  cy.intercept('POST', '**/api/contact', { statusCode: code, body: CONTRACT[code], delay: ms }).as('contact')
})

Given('the contact endpoint answers 400 for field {string}', (field: string) => {
  cy.intercept('POST', '**/api/contact', {
    statusCode: 400,
    body: { success: false, error: 'Invalid input', details: [{ path: field, msg: 'Too short' }] },
  }).as('contact')
})

function field(label: string) {
  return cy
    .get('[role="dialog"] label')
    .filter((_, el) => norm((el as HTMLElement).innerText) === label)
    .first()
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`))
}

When('the visitor types {string} into {string}', (text: string, label: string) => {
  field(label).type(text)
})

When('a bot fills the honeypot field {string} with {string}', (name: string, text: string) => {
  cy.get(`[role="dialog"] input[name="${name}"]`).type(text, { force: true })
})

Then('the field {string} has aria-invalid {string}', (label: string, value: string) => {
  field(label).should('have.attr', 'aria-invalid', value)
})

Then('the field {string} has placeholder {string}', (label: string, value: string) => {
  field(label).should('have.attr', 'placeholder', value)
})

Then('the field {string} has value {string}', (label: string, value: string) => {
  field(label).should('have.value', value)
})

Then('the field {string} is empty', (label: string) => {
  field(label).should('have.value', '')
})

Then('the field {string} is described by {string}', (label: string, text: string) => {
  field(label)
    .invoke('attr', 'aria-describedby')
    .then((ids) => {
      expect(ids, 'aria-describedby').to.be.a('string')
      const joined = String(ids)
        .split(/\s+/)
        .map((id) => Cypress.$(`[id="${id}"]`).text())
        .join(' ')
      expect(norm(joined)).to.contain(text)
    })
})

Then('the field {string} has the ok state', (label: string) => {
  // Design: valid email turns the border green (#1f9e6e in Interactions "Form fields").
  field(label).should('have.css', 'border-top-color', 'rgb(31, 158, 110)')
})

Then('the hint {string} is coloured {string}', (text: string, colour: string) => {
  cy.get('[role="dialog"]').contains(text).should('have.css', 'color', colour)
})

Then('no contact request was sent', () => {
  cy.wait(600)
  cy.get('@contact.all').should('have.length', 0)
})

function lastBody() {
  return cy.get('@contact.all').should('have.length.gte', 1).then((calls: any) => {
    const body = calls[calls.length - 1].request.body
    return typeof body === 'string' ? JSON.parse(body) : body
  })
}

Then('the contact request body is exactly:', (json: string) => {
  cy.wait('@contact')
  lastBody().should('deep.equal', JSON.parse(json))
})

Then('the contact request body has {string} {string}', (key: string, value: string) => {
  cy.contains('[role="dialog"] *', /Message sent!|Let’s build something/).should('exist')
  lastBody().its(key).should('eq', value)
})

Then('the chip {string} is pressed', (name: string) => {
  byName(name, 'button', '[role="dialog"]').should('have.attr', 'aria-pressed', 'true')
})

Then('the chip {string} is not pressed', (name: string) => {
  byName(name, 'button', '[role="dialog"]').should('have.attr', 'aria-pressed', 'false')
})

Then('the submit button reads {string} and is disabled', (text: string) => {
  cy.get('[role="dialog"] button[type="submit"]').should(($b) => {
    expect(norm($b[0].innerText)).to.contain(text)
    const disabled = $b[0].hasAttribute('disabled') || $b[0].getAttribute('aria-disabled') === 'true'
    expect(disabled, 'disabled or aria-disabled').to.eq(true)
  })
})

Then('the dialog has a link {string} to {string}', (name: string, href: string) => {
  cy.get(`[role="dialog"] a[href="${href}"]`).filter((_, el) => accName(el) === name).should('have.length', 1)
})

Then('the honeypot field {string} is hidden and out of the tab order', (name: string) => {
  cy.get(`[role="dialog"] input[name="${name}"]`).should(($i) => {
    const el = $i[0]
    expect(el.getAttribute('tabindex'), 'tabindex').to.eq('-1')
    const r = el.getBoundingClientRect()
    const hiddenFromAT = Boolean(el.closest('[aria-hidden="true"]'))
    const tiny = r.width <= 1 || r.height <= 1 || r.right < 0 || r.bottom < 0
    expect(hiddenFromAT, 'aria-hidden wrapper').to.eq(true)
    expect(tiny || !Cypress.dom.isVisible(el), 'not visible to people').to.eq(true)
  })
})

Then('the {string} button can be scrolled into view inside the dialog', (name: string) => {
  byName(name, 'button', '[role="dialog"]').first().scrollIntoView().should(($b) => {
    const r = $b[0].getBoundingClientRect()
    const vh = $b[0].ownerDocument.defaultView!.innerHeight
    expect(r.top, 'button top on screen').to.be.gte(0)
    expect(r.bottom, 'button bottom on screen').to.be.lte(vh)
  })
})
