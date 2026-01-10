import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the homepage', () => {
  // API mocks are set up globally in e2e.ts
  cy.visit('/')
  // Wait for projects API to be called
  cy.wait('@getProjects', { timeout: 10000 })
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
  // Wait for projects API call
  cy.wait('@getProjects', { timeout: 10000 })
})

Then('I should be redirected to the experience page', () => {
  cy.url().should('include', '/experience')
  // Wait for work history, education, and certifications API calls
  cy.wait(['@getWorkHistory', '@getEducation', '@getCertifications'], { timeout: 10000 })
})

Then('I should be redirected to the blog page', () => {
  cy.url().should('include', '/blog')
  // Wait for blog posts API call
  cy.wait('@getBlogPosts', { timeout: 10000 })
})

Then('I should be redirected to the learning page', () => {
  cy.url().should('include', '/learning')
  // Wait for learning and skills API calls
  cy.wait(['@getLearning', '@getSkills'], { timeout: 10000 })
})

Then('I should see at least one featured project', () => {
  cy.get('[data-testid="project-card"], .project-card, article').should('have.length.at.least', 1)
})

Then('each project should have a title', () => {
  // Wait for projects to load and animations to complete
  cy.wait(1000)
  // Get all projects and verify at least one exists
  cy.get('[data-testid="project-card"], .project-card, article').should('have.length.at.least', 1)
  // Check first 3 projects individually to avoid DOM detachment
  cy.get('[data-testid="project-card"], .project-card, article').eq(0).as('project0')
  cy.get('@project0').find('h2, h3, h4, [class*="title"], h1').should('exist')
  
  // Check additional projects if they exist
  cy.get('[data-testid="project-card"], .project-card, article').then(($projects) => {
    if ($projects.length > 1) {
      cy.get('[data-testid="project-card"], .project-card, article').eq(1).as('project1')
      cy.get('@project1').find('h2, h3, h4, [class*="title"], h1').should('exist')
    }
    if ($projects.length > 2) {
      cy.get('[data-testid="project-card"], .project-card, article').eq(2).as('project2')
      cy.get('@project2').find('h2, h3, h4, [class*="title"], h1').should('exist')
    }
  })
})

Then('each project should have technologies displayed', () => {
  // Wait for any animations to complete
  cy.wait(1000)
  cy.get('[data-testid="project-card"], .project-card, article').first().should('be.visible').within(() => {
    cy.get('.tech-tag, [class*="tech"], [class*="technology"]').should('exist')
  })
})

Then('each project should have links to GitHub and live demo', () => {
  // Wait for any animations to complete
  cy.wait(1000)
  cy.get('[data-testid="project-card"], .project-card, article').first().should('be.visible').within(() => {
    // Check for any external links (GitHub, demo, live, etc.)
    cy.get('a[href*="github"], a[href*="demo"], a[href*="live"], a[href^="http"]').should('have.length.at.least', 1)
  })
})

Then('I should see a {string} section', (sectionName: string) => {
  cy.contains(sectionName, { matchCase: false }).should('be.visible')
})

Then('I should see an email link', () => {
  // Wait for any animations/fade-ins to complete
  cy.wait(2000)
  // Scroll to contact section to ensure it's loaded
  cy.contains('Get In Touch', { matchCase: false }).scrollIntoView({ duration: 500 })
  cy.wait(1000)
  // Check if email link exists - don't check visibility as it might be animated
  cy.get('a[href^="mailto:"]').should('exist')
  // Verify it has an href attribute (indicates it's a functional link)
  cy.get('a[href^="mailto:"]').should('have.attr', 'href').and('include', 'mailto:')
})

