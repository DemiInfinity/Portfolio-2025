import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'

Given('I visit the blog page', () => {
  cy.visit('/blog')
})

Then('I should see a list of blog posts', () => {
  cy.get('article, [data-testid="blog-post"], .blog-post').should('have.length.at.least', 1)
})

Then('each post should have a title', () => {
  cy.get('article, [data-testid="blog-post"], .blog-post').each(($post) => {
    cy.wrap($post).find('h2, h3, h4').should('exist')
  })
})

Then('each post should have a publish date', () => {
  cy.get('article, [data-testid="blog-post"], .blog-post').first().within(() => {
    cy.contains(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/).should('exist')
  })
})

Then('each post should have a category', () => {
  cy.get('article, [data-testid="blog-post"], .blog-post').first().within(() => {
    cy.get('[class*="category"], [class*="tag"]').should('exist')
  })
})

When('I click on a blog post', () => {
  cy.get('article, [data-testid="blog-post"], .blog-post').first().find('a, h2 a, h3 a').first().click()
})

Then('I should see the full blog post content', () => {
  cy.url().should('include', '/blog/')
  cy.get('article, [data-testid="blog-content"], .blog-content').should('be.visible')
})

Then('I should see the post title', () => {
  cy.get('h1, h2').should('be.visible')
})

Then('I should see the post author', () => {
  cy.contains('author', { matchCase: false }).should('exist')
})

Then('I should see the post publish date', () => {
  cy.contains(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/).should('exist')
})

Then('I should see the post content', () => {
  cy.get('article, [data-testid="blog-content"], .blog-content').should('not.be.empty')
})

When('I view a blog post', () => {
  cy.visit('/blog')
  cy.get('article, [data-testid="blog-post"], .blog-post').first().find('a, h2 a, h3 a').first().click()
})

Then('the page should have Open Graph meta tags', () => {
  cy.get('head meta[property^="og:"]').should('have.length.at.least', 1)
})

Then('the page should have Twitter Card meta tags', () => {
  cy.get('head meta[name^="twitter:"]').should('have.length.at.least', 1)
})

