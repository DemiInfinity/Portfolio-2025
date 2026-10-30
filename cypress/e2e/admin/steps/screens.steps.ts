/// <reference types="cypress" />
import { Then } from '@badeball/cypress-cucumber-preprocessor'

Then('the admin takes a full-page screenshot named {string}', (name: string) => {
  cy.wait(800)
  cy.screenshot('admin-visual/' + name, { capture: 'fullPage', overwrite: true })
})
