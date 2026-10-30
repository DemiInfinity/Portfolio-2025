/// <reference types="cypress" />
import { Then } from '@badeball/cypress-cucumber-preprocessor'
import { norm } from './helpers'

Then('the admin sees that the sign-in alert reads {string}', (msg: string) => {
  cy.get('[role="alert"]').should('be.visible').and(($a) => expect(norm($a.text())).to.eq(msg))
})

Then('the admin sees that the sign-in button is busy', () => {
  cy.get('button[type="submit"]').should('be.disabled').and(($b) => {
    expect(norm($b.text())).to.eq('Signing in')
    expect($b.find('.spin').length).to.be.greaterThan(0)
  })
})

Then('the admin sees that the sign-in card sits above the site screenshot', () => {
  cy.get('figure').should('exist').then(($fig) => {
    cy.get('form').then(($form) => {
      expect($form[0].getBoundingClientRect().top).to.be.lessThan($fig[0].getBoundingClientRect().top)
    })
  })
})
