import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the admin login page', () => {
  cy.visit('/admin')
  cy.url().should('include', '/admin')
})

When('I enter valid admin credentials', () => {
  const email = Cypress.env('ADMIN_EMAIL') || 'admin@example.com'
  const password = Cypress.env('ADMIN_PASSWORD') || 'password'
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
})

When('I enter invalid admin credentials', () => {
  cy.get('input[type="email"]').type('invalid@example.com')
  cy.get('input[type="password"]').type('wrongpassword')
})

When('I click the login button', () => {
  cy.get('button[type="submit"]').click()
})

Then('I should be redirected to the admin dashboard', () => {
  cy.url().should('include', '/admin/dashboard')
})

Then('I should see the admin navigation menu', () => {
  cy.get('nav, [role="navigation"], aside').should('be.visible')
})

Then('I should see an error message', () => {
  cy.contains('error', { matchCase: false }).should('be.visible')
})

Then('I should remain on the login page', () => {
  cy.url().should('include', '/admin')
  cy.url().should('not.include', '/dashboard')
})

Given('I am logged in as admin', () => {
  const email = Cypress.env('ADMIN_EMAIL') || 'admin@example.com'
  const password = Cypress.env('ADMIN_PASSWORD') || 'password'
  cy.login(email, password)
})

When('I click the logout button', () => {
  cy.contains('logout', { matchCase: false }).click()
})

Then('I should be redirected to the login page', () => {
  cy.url().should('include', '/admin')
  cy.url().should('not.include', '/dashboard')
})

Then('I should not see the admin dashboard', () => {
  cy.get('[data-testid="dashboard"], .dashboard').should('not.exist')
})

