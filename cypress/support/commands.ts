/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login to admin panel
       * @example cy.login('admin@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>
      
      /**
       * Custom command to wait for API response
       * @example cy.waitForAPI('GET', '/api/projects')
       */
      waitForAPI(method: string, url: string, alias?: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  // Use test-only credentials for Cypress tests
  const testEmail = 'test-admin@example.com'
  const testPassword = 'test-password-123'
  
  // Intercept API calls with mock responses
  cy.fixture('admin-auth').then((authData) => {
    // Intercept login API
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: authData.loginSuccess,
    }).as('loginApi')
    
    // Intercept /auth/me endpoint (called after successful login)
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: authData.userData,
    }).as('getUserApi')
    
    const adminUrl = Cypress.env('ADMIN_URL') || 'http://localhost:3002'
    cy.visit(adminUrl)
    
    // Use test credentials regardless of what was passed
    cy.get('input[type="email"]').type(testEmail)
    cy.get('input[type="password"]').type(testPassword)
    cy.get('button[type="submit"]').click()
    
    // Wait for login API call to complete
    cy.wait('@loginApi')
    cy.wait('@getUserApi', { timeout: 5000 })
    
    // Verify redirect to dashboard
    cy.url().should('include', 'dashboard')
  })
})

Cypress.Commands.add('waitForAPI', (method: string, url: string, alias?: string) => {
  const apiAlias = alias || `api${method}${url.replace(/\//g, '_')}`
  cy.intercept(method, url).as(apiAlias)
  cy.wait(`@${apiAlias}`)
  return cy.get(`@${apiAlias}`)
})

export {}

