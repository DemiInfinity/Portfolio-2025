@site
Feature: Maintenance, 404 and 500 pages (Maintenance.dc.html, NotFound.dc.html, Error.dc.html)

  Background:
    Given the visitor uses a desktop screen

  Scenario: Maintenance on: the page, its links, and the exempt routes
    Given maintenance mode is on
    When the visitor opens "/"
    Then the visitor sees the maintenance page
    And the visitor sees "Maintenance in progress"
    And the page has a link containing "view the CV" to "/cv"
    And the page has a link to "/privacy"
    And the page has a link to "/terms"
    And there is no "Main" nav
    When the visitor opens "/projects"
    Then the visitor sees the maintenance page
    When the visitor opens "/cv"
    Then the page heading is "Demi Taylor Nimmo"
    When the visitor opens "/privacy"
    Then the page heading is "Privacy Policy"
    When the visitor opens "/terms"
    Then the page heading is "Terms of Use"

  Scenario: Maintenance off: the normal site
    When the visitor opens "/"
    Then the page heading is "Hi, I’m Demi Taylor Nimmo"
    And the page does not show "Maintenance in progress"

  Scenario: 404: real status, inside the site chrome, with the design's links
    Then a request to "/does-not-exist" answers status 404
    When the visitor opens "/does-not-exist"
    Then the page heading is "This page took a wrong turn"
    And the "Main" nav links are "Home, Projects, Experience, About, Blog"
    And the footer links to "/projects, /about"
    And the "Popular pages" nav links to "/projects, /experience, /about, /blog"
    And the page has a link containing "Back to home" to "/"
    When the visitor clicks "Tell me what you were after"
    Then the dialog "Let’s build something" is open

  Scenario: 404 at 390px has no sideways scroll
    Given the visitor uses a phone screen
    When the visitor opens "/does-not-exist"
    Then the page has no sideways scroll

  Scenario: 500: a server error shows the error page with Try again, and a reference with the digest
    Given the site mock answers "GET /api/work-history" with status 500
    When the visitor opens "/experience"
    Then the "Try again" button is visible
    And the page has a link containing "Back to home" to "/"
    And the error reference reads "ERR " followed by the digest
    When the visitor clicks "Let me know"
    Then the dialog "Let’s build something" is open

  Scenario: 500: Try again recovers once the API is back (retry re-fetches)
    Given the site mock answers "GET /api/work-history" with status 500
    And uncaught React error 419 is tolerated in this scenario
    When the visitor opens "/experience"
    Then the "Try again" button is visible
    When the site mock is healthy again
    And the visitor clicks "Try again"
    Then the page heading eventually contains "My experience"

  Scenario: 500 on bare /cv: "Let me know" is a mailto link
    Given the site mock answers "GET /api/cv" with status 500
    When the visitor opens "/cv"
    Then the "Try again" button is visible
    And the page has a link containing "Let me know" to "mailto:demi.21@outlook.com"

  Scenario: 500: recovering with Try again throws no uncaught error (NON-BLOCKING N-8)
    Given the site mock answers "GET /api/work-history" with status 500
    When the visitor opens "/experience"
    Then the "Try again" button is visible
    When the site mock is healthy again
    And the visitor clicks "Try again"
    Then the page heading eventually contains "My experience"
    And the visitor waits 1000 ms
