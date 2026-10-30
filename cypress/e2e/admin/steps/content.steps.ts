/// <reference types="cypress" />
import { Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { exact, lastCall, norm } from './helpers'

Then('the admin sees row {int} includes {string}, {string}, {string} and {string}', (i: number, a: string, b: string, c: string, d: string) => {
  cy.get('ul.rows > li.row').eq(i - 1).should(($r) => [a, b, c, d].forEach((t) => expect(norm($r.text())).to.contain(t)))
})

Then('the admin sees row {int} includes {string}, {string} and {string}', (i: number, a: string, b: string, c: string) => {
  cy.get('ul.rows > li.row').eq(i - 1).should(($r) => [a, b, c].forEach((t) => expect(norm($r.text())).to.contain(t)))
})

Then('the admin sees a dialog titled {string} is open or the dialog stays open', (_t: string) => {
  cy.get('[role="dialog"]').should('be.visible')
})

When('the admin clicks {string} in the dialog', (name: string) => {
  cy.get('[role="dialog"]').filter(':visible').last().contains('button', exact(name)).click()
})

Then('the admin sees the last POST to {string} has the keys {string}', (path: string, keys: string) => {
  lastCall('POST', path).then((c) => expect(Object.keys(c.body).sort()).to.include.members(keys.split(', ')))
})
