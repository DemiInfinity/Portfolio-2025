import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the homepage', () => {
  cy.visit('/')
})

Then('I should see the main heading', () => {
  cy.get('h1').should('be.visible')
  cy.get('h1').should('contain.text', 'Demi')
})

Then('I should see navigation links', () => {
  cy.get('nav').should('be.visible')
  cy.get('nav a').should('have.length.at.least', 1)
})

Then('I should see featured projects', () => {
  cy.get('[data-testid="project-card"], .project-card, article').should('have.length.at.least', 1)
})

When('I click on the {string} link', (linkText: string) => {
  cy.get('nav').contains(linkText).click()
})

Then('I should be redirected to the projects page', () => {
  cy.url().should('include', '/projects')
})

Then('I should be redirected to the experience page', () => {
  cy.url().should('include', '/experience')
})

Then('I should be redirected to the blog page', () => {
  cy.url().should('include', '/blog')
})

Then('I should be redirected to the learning page', () => {
  cy.url().should('include', '/learning')
})

Then('I should see at least one featured project', () => {
  cy.get('[data-testid="project-card"], .project-card, article').should('have.length.at.least', 1)
})

Then('each project should have a title', () => {
  cy.get('[data-testid="project-card"], .project-card, article').each(($project) => {
    cy.wrap($project).find('h2, h3, h4').should('exist')
  })
})

Then('each project should have technologies displayed', () => {
  cy.get('[data-testid="project-card"], .project-card, article').first().within(() => {
    cy.get('.tech-tag, [class*="tech"]').should('exist')
  })
})

Then('each project should have links to GitHub and live demo', () => {
  cy.get('[data-testid="project-card"], .project-card, article').first().within(() => {
    cy.get('a[href*="github"], a[href*="demo"], a[href*="live"]').should('exist')
  })
})

Then('I should see a {string} section', (sectionName: string) => {
  cy.contains(sectionName, { matchCase: false }).should('be.visible')
})

Then('I should see an email link', () => {
  cy.get('a[href^="mailto:"]').should('be.visible')
})

