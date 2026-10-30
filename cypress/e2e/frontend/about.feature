@site
Feature: About (F-15, D-1, D-6, H-16, H-17)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-15 AC1 route, heading and title
    When the visitor opens "/about"
    Then the page heading is "About me"
    And the document title is "About | Demi Taylor Nimmo"

  Scenario: F-15 AC2 intro paragraphs come from the API
    When the visitor opens "/about"
    Then the visitor sees "I’m a mock intro paragraph one, written for the e2e tests."
    And the visitor sees "Mock paragraph two talks about craft and care."

  Scenario: F-15 AC3 and D-6 open_to_work on: looking-for panel
    Given the site flag "open_to_work" is on
    When the visitor opens "/about"
    Then there is a heading "What I’m looking for"
    And the visitor sees "Mock summary: a product team that ships."
    And the visitor sees "Role"
    And the visitor sees "Mock senior full-stack"
    And the visitor sees "Where"
    And the visitor sees "Mock remote or Newcastle"
    And the page does not show "Mock off line: happily busy, say hi anyway"

  Scenario: F-15 AC3 and D-6 open_to_work off: the soft line instead
    Given the site flag "open_to_work" is off
    When the visitor opens "/about"
    Then there is no heading "What I’m looking for"
    And the visitor sees "Mock off line: happily busy, say hi anyway"
    And the page does not show "Mock summary: a product team that ships."
    When the visitor clicks "Get in touch"
    Then the dialog "Let’s build something" is open

  Scenario: F-15 AC3 and D-6 the panel's Hire me opens contact
    Given the site flag "open_to_work" is on
    When the visitor opens "/about"
    And the visitor clicks "Hire me" in the "#looking-for" section
    Then the dialog "Let’s build something" is open

  Scenario: F-19 AC8 About Download CV (flag on) uses the PDF URL as given
    Given the site flag "open_to_work" is on
    And the site resume is available at "https://x/cv.pdf?v=1"
    When the visitor opens "/about"
    Then the "Download CV" link points to "https://x/cv.pdf?v=1" with a download attribute

  Scenario: F-19 AC8 About: no Download CV when unavailable
    Given the site flag "open_to_work" is on
    And the site resume is unavailable
    When the visitor opens "/about"
    And the visitor waits for the resume check
    Then the page does not show "Download CV"

  Scenario: F-15 AC4 currently learning: max 4, Just started, bar width
    When the visitor opens "/about"
    Then the Currently learning list has 4 rows
    And the last Currently learning row shows "Just started"
    And the first Currently learning bar is 19% wide

  Scenario: F-15 AC5 See all courses dialog
    When the visitor opens "/about"
    And the visitor clicks "See all courses"
    Then the dialog "My learning journey" is open
    And the dialog shows "4 courses in progress"
    And the dialog shows "Udemy · Started January 2026 · Target December 2026"
    And the dialog shows "Goal: Write safer generics"
    When the visitor presses Escape 1 times
    Then no dialog is open
    And the focused element is "See all courses"

  Scenario: F-15 AC6 one recommendation with full_text
    When the visitor opens "/about"
    Then the "Read the full recommendation" button has aria-expanded "false"
    And the page does not show "Full mock recommendation text that only shows when expanded."
    When the visitor clicks "Read the full recommendation"
    Then the "Show less" button has aria-expanded "true"
    And the visitor sees "Full mock recommendation text that only shows when expanded."
    And there is no "Previous" button
    And there is no "Next" button

  Scenario: F-15 recommendation caption
    When the visitor opens "/about"
    Then the visitor sees "Adam Mellor"
    And the visitor sees "Engineering Manager at Cintra · managed Demi directly"
    And the visitor sees "LinkedIn recommendation, April 2026"
    And the page has a link containing "More on LinkedIn" to "https://www.linkedin.com/in/adam-example"

  Scenario: F-15 AC6 no full_text, no toggle
    Given the site mock "recommendations" is:
      """
      [{ "id": 1, "quote": "Short quote only.", "full_text": null, "name": "Sam Jones", "role": null, "company": null, "relationship": null, "source": null, "source_url": null, "date": null, "show_on_cv": false, "sort_order": 0 }]
      """
    When the visitor opens "/about"
    Then the visitor sees "Short quote only."
    And there is no "Read the full recommendation" button
    And the page has a link containing "More on LinkedIn" to "https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40"

  Scenario: F-15 AC7 two recommendations: Next shows the second
    Given the site mock "recommendations" is the fixture "recommendations-two.json"
    When the visitor opens "/about"
    Then the visitor sees "Adam Mellor"
    When the visitor clicks "Next"
    Then the visitor sees "Priya Shah"
    When the visitor clicks "Previous"
    Then the visitor sees "Adam Mellor"

  Scenario: F-15 AC8 no recommendations: section hidden
    Given the site mock "recommendations" is:
      """
      []
      """
    When the visitor opens "/about"
    Then there is no heading "Kind words"

  Scenario: F-15 AC8 recommendations 500: the page still renders
    Given the site mock answers "GET /api/recommendations" with status 500
    When the visitor opens "/about"
    Then the page heading is "About me"
    And there is no heading "Kind words"

  Scenario: F-15 AC9 latest writing: two newest posts
    When the visitor opens "/about"
    Then Latest writing links to "/blog/shipping-a-desktop-app, /blog/postgres-row-level-security"
    And the visitor sees "Desktop · 7 January 2026"

  Scenario: F-15 AC10 certifications: none, no heading
    Given the site mock "certifications" is:
      """
      []
      """
    When the visitor opens "/about"
    Then there is no heading "Certifications"

  Scenario: F-15 AC10 certifications: one, name and credential link
    When the visitor opens "/about"
    Then there is a heading "Certifications"
    And the visitor sees "AWS Certified Cloud Practitioner"
    And the page has a link containing "Check credential" to "https://aws.example.com/cred/1"

  Scenario: F-15 AC11 learning 500: the rest of the page renders
    Given the site mock answers "GET /api/learning" with status 500
    When the visitor opens "/about"
    Then the page heading is "About me"
    And the visitor sees "I’m a mock intro paragraph one, written for the e2e tests."
    And there is a heading "Certifications"

  Scenario: F-15 AC11 about content 500: seed intro fallback
    Given the site mock answers "GET /api/content/about" with status 500
    When the visitor opens "/about"
    Then the page heading is "About me"
    And the visitor sees "I’m Demi, a full-stack software engineer"

  Scenario: F-15 about content endpoint missing (404 before the migration): seed intro fallback
    Given the site mock answers "GET /api/content/about" with status 404
    And the site mock answers "GET /api/recommendations" with status 404
    When the visitor opens "/about"
    Then the page heading is "About me"
    And the visitor sees "I’m Demi, a full-stack software engineer"
    And there is no heading "Kind words"

  Scenario: F-15 AC12 reduced motion shows the full code card at once
    Given the visitor prefers reduced motion
    When the visitor opens "/about"
    Then the code card contains "export default demi;"

  Scenario: F-15 code card types out without reduced motion
    When the visitor opens "/about"
    Then the code card eventually contains "export default demi;"

  Scenario: F-15 JSON-LD Person
    When the visitor opens "/about"
    Then the page has JSON-LD of type "Person"
