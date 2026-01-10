import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

// Test-only credentials for Cypress tests
const TEST_EMAIL = 'test-admin@example.com'
const TEST_PASSWORD = 'test-password-123'

Given('I visit the admin login page', () => {
  const adminUrl = Cypress.env('ADMIN_URL') || 'http://localhost:3002'
  
  // Intercept login API with conditional response based on credentials
  cy.fixture('admin-auth').then((authData) => {
    cy.intercept('POST', '**/api/auth/login', (req) => {
      // Check if credentials match test credentials
      if (
        req.body.email === TEST_EMAIL &&
        req.body.password === TEST_PASSWORD
      ) {
        req.reply({
          statusCode: 200,
          body: authData.loginSuccess,
        })
      } else {
        // Invalid credentials
        req.reply({
          statusCode: 401,
          body: authData.loginFailure,
        })
      }
    }).as('loginApi')
    
    // Intercept /auth/me endpoint (used after successful login)
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: authData.userData,
    }).as('getUserApi')
    
    // Intercept logout API (in case it's called)
    cy.intercept('POST', '**/api/auth/logout', {
      statusCode: 200,
      body: { success: true, message: 'Logged out successfully' },
    }).as('logoutApi')
  })
  
  cy.visit(adminUrl)
  cy.url().should('include', 'localhost:3002')
})

When('I enter valid admin credentials', () => {
  cy.get('input[type="email"]').type(TEST_EMAIL)
  cy.get('input[type="password"]').type(TEST_PASSWORD)
})

When('I enter invalid admin credentials', () => {
  cy.get('input[type="email"]').type('invalid@example.com')
  cy.get('input[type="password"]').type('wrongpassword')
})

When('I click the login button', () => {
  cy.get('button[type="submit"]').click()
  // Wait for the login API call to complete
  cy.wait('@loginApi')
})

Then('I should be redirected to the admin dashboard', () => {
  // Wait for any navigation/redirect to complete
  cy.wait('@getUserApi', { timeout: 5000 }).then(() => {
    cy.url().should('include', 'dashboard')
  })
})

Then('I should see the admin navigation menu', () => {
  cy.get('nav, [role="navigation"], aside').should('be.visible')
})

Then('I should see an error message', () => {
  // Wait for the failed login API call
  cy.wait('@loginApi').then((interception) => {
    expect(interception.response?.statusCode).to.eq(401)
  })
  cy.contains('error', { matchCase: false }).should('be.visible')
})

Then('I should remain on the login page', () => {
  cy.url().should('not.include', '/dashboard')
})

Given('I am logged in as admin', () => {
  // Use test-only credentials and mock API responses
  cy.fixture('admin-auth').then((authData) => {
    // Intercept login API
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: authData.loginSuccess,
    }).as('loginApi')
    
    // Intercept /auth/me endpoint
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: authData.userData,
    }).as('getUserApi')
    
    // Intercept logout API
    cy.intercept('POST', '**/api/auth/logout', {
      statusCode: 200,
      body: { success: true, message: 'Logged out successfully' },
    }).as('logoutApi')
    
    const adminUrl = Cypress.env('ADMIN_URL') || 'http://localhost:3002'
    cy.visit(adminUrl)
    
    // Fill in test credentials
    cy.get('input[type="email"]').type(TEST_EMAIL)
    cy.get('input[type="password"]').type(TEST_PASSWORD)
    cy.get('button[type="submit"]').click()
    
    // Wait for login to complete
    cy.wait('@loginApi')
    cy.wait('@getUserApi', { timeout: 5000 })
    
    // Verify we're on the dashboard
    cy.url().should('include', 'dashboard')
  })
})

When('I click the logout button', () => {
  // Intercept logout API call
  cy.intercept('POST', '**/api/auth/logout', {
    statusCode: 200,
    body: { success: true, message: 'Logged out successfully' },
  }).as('logoutApi')
  
  cy.contains('logout', { matchCase: false }).click()
  cy.wait('@logoutApi')
})

Then('I should be redirected to the login page', () => {
  cy.url().should('not.include', '/dashboard')
})

Then('I should not see the admin dashboard', () => {
  cy.get('[data-testid="dashboard"], .dashboard').should('not.exist')
})

