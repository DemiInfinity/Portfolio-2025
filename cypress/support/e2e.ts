// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Set up global API mocks for all tests
beforeEach(() => {
  // Load API response fixtures
  cy.fixture('api-responses').then((apiData) => {
    // Mock projects API
    cy.intercept('GET', '**/api/projects', {
      statusCode: 200,
      body: apiData.projects,
    }).as('getProjects')
    
    // Mock blog posts API
    cy.intercept('GET', '**/api/blog', {
      statusCode: 200,
      body: apiData.blogPosts,
    }).as('getBlogPosts')
    
    // Mock individual blog post API (catch-all for any slug)
    cy.intercept('GET', '**/api/blog/*', (req) => {
      const urlParts = req.url.split('/blog/')
      const slug = urlParts.length > 1 ? urlParts[1].split('?')[0] : 'test-blog-post-1'
      // Return the specific blog post if slug matches, otherwise return the first one
      const post = apiData.blogPosts.data.find((p: any) => p.slug === slug) || apiData.blogPosts.data[0] || apiData.blogPost.data
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: post,
        },
      })
    }).as('getBlogPost')
    
    // Mock learning API
    cy.intercept('GET', '**/api/learning', {
      statusCode: 200,
      body: apiData.learning,
    }).as('getLearning')
    
    // Mock skills API
    cy.intercept('GET', '**/api/skills', {
      statusCode: 200,
      body: apiData.skills,
    }).as('getSkills')
    
    // Mock work history API
    cy.intercept('GET', '**/api/work-history', {
      statusCode: 200,
      body: apiData.workHistory,
    }).as('getWorkHistory')
    
    // Mock education API
    cy.intercept('GET', '**/api/education', {
      statusCode: 200,
      body: apiData.education,
    }).as('getEducation')
    
    // Mock certifications API
    cy.intercept('GET', '**/api/certifications', {
      statusCode: 200,
      body: apiData.certifications,
    }).as('getCertifications')
    
    // Mock feature flags API (for maintenance mode)
    cy.intercept('GET', '**/api/feature-flags/maintenance', {
      statusCode: 200,
      body: apiData.featureFlags,
    }).as('getFeatureFlags')
    
    // Mock analytics API (don't fail tests if this is called)
    cy.intercept('POST', '**/api/analytics/track', {
      statusCode: 200,
      body: { success: true },
    }).as('trackAnalytics')
  })
})

// Hide fetch/XHR requests from command log
const app = window.top
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style')
  style.innerHTML =
    '.command-name-request, .command-name-xhr { display: none }'
  style.setAttribute('data-hide-command-log-request', '')
  app.document.head.appendChild(style)
}

