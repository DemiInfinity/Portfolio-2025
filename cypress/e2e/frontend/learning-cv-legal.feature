@site
Feature: Learning, CV and legal pages (F-18, F-19, F-20, D-5, D-8)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-18 AC1 one card per in-progress item with its percentage
    When the visitor opens "/learning"
    Then the page heading contains "My learning journey"
    And the visitor sees "Advanced TypeScript"
    And the course "Advanced TypeScript" shows "19%"
    And the course "Swift concurrency" shows "1%"
    And the visitor sees "Docker fundamentals"

  Scenario: F-18 paused items are labelled
    Given the site mock "learning" is:
      """
      [{ "id": 9, "title": "Paused course", "provider": "Udemy", "description": "Later", "progress": 40, "status": "paused", "start_date": "2026-01-01", "estimated_completion": null }]
      """
    When the visitor opens "/learning"
    Then the course "Paused course" shows "Paused"

  Scenario: F-18 AC2 skills 500: courses plus a note
    Given the site mock answers "GET /api/skills" with status 500
    When the visitor opens "/learning"
    Then the visitor sees "Advanced TypeScript"
    And the page shows a note that skills couldn't load

  Scenario: F-19 AC1 h1 and section order
    When the visitor opens "/cv"
    Then the page heading is "Demi Taylor Nimmo"
    And the CV section headings are "Profile, Experience, Skills, AI-assisted workflow, Selected projects, Education, Currently learning, Recommendation"

  Scenario: F-19 AC1 Certifications sits between Education and Currently learning when present
    Given the CV mock has one certification
    When the visitor opens "/cv"
    Then the CV section headings are "Profile, Experience, Skills, AI-assisted workflow, Selected projects, Education, Certifications, Currently learning, Recommendation"

  Scenario: F-19 AC2 profile and headline from the API
    When the visitor opens "/cv"
    Then the CV Profile text is "Mock CV profile paragraph."
    And the visitor sees "Mock CV headline"

  Scenario: F-19 AC3 roles and cv-style dates
    When the visitor opens "/cv"
    Then the visitor sees "Software Engineer · Cintra"
    And the visitor sees "Aug 2025 – Present"
    And the visitor sees "Jun 2024 – Aug 2024"

  Scenario: F-19 selected projects are the first three
    When the visitor opens "/cv"
    Then the visitor sees "LunaLore"
    And the visitor sees "Rebel Verify"
    And the page does not show "Fourth project, must not be listed."

  Scenario: F-19 AC4 no phone number; footer note present
    When the visitor opens "/cv"
    Then the CV text has no phone number
    And the CV mentions "Phone available on request"

  Scenario: F-19 AC5 and D-5 noindex, not in the sitemap
    When the visitor opens "/cv"
    Then the meta "robots" contains "noindex"
    And the sitemap does not list "/cv"

  Scenario: F-19 AC6 maintenance on: /cv still renders, and records no analytics
    Given maintenance mode is on
    And the visitor watches analytics requests
    When the visitor opens "/cv"
    And the visitor waits 2000 ms
    Then the page heading is "Demi Taylor Nimmo"
    And no analytics request was sent

  Scenario: F-19 control: other pages do record analytics and show maintenance
    Given maintenance mode is on
    And the visitor watches analytics requests
    When the visitor opens "/projects"
    Then the visitor sees the maintenance page

  Scenario: F-19 control: analytics fires on a normal page
    Given the visitor watches analytics requests
    When the visitor opens "/projects"
    And the visitor waits 2000 ms
    Then at least one analytics request was sent

  Scenario: F-19 AC7 null recommendation and empty AI paragraph drop their sections
    Given the CV mock has no recommendation and an empty AI paragraph
    When the visitor opens "/cv"
    Then there is no heading "Recommendation"
    And there is no heading "AI-assisted workflow"

  Scenario: F-19 pre-migration CV (no profile, no recommendation) still renders
    Given the CV mock has no profile and no recommendation keys
    When the visitor opens "/cv"
    Then the page heading is "Demi Taylor Nimmo"
    And there is a heading "Experience"
    And there is no heading "Recommendation"

  Scenario: F-19 CV API failure shows the error frame
    Given the site mock answers "GET /api/cv" with status 500
    When the visitor opens "/cv"
    Then the "Try again" button is visible

  Scenario: F-19 AC8 unavailable resume: no Download CV on Home or About
    Given the site resume is unavailable
    And the site flag "open_to_work" is on
    When the visitor opens "/"
    And the visitor waits for the resume check
    Then the page does not show "Download CV"
    When the visitor opens "/about"
    And the visitor waits for the resume check
    Then the page does not show "Download CV"

  Scenario: F-20 AC2 legal headings
    When the visitor opens "/privacy"
    Then the page heading is "Privacy Policy"
    When the visitor opens "/terms"
    Then the page heading is "Terms of Use"

  Scenario: F-20 AC3 analytics opt-out
    When the visitor opens "/privacy"
    And the visitor clicks "Turn site analytics off"
    Then the "Turn site analytics on" button is visible
    And localStorage "portfolio_analytics_opt_out" is "1"

  Scenario: F-20 show_marbl gates Marbl on Privacy
    Given the site flag "show_marbl" is off
    When the visitor opens "/privacy"
    Then the page does not show "Marbl"
    Given the site flag "show_marbl" is on
    When the visitor opens "/privacy"
    Then the visitor sees "Marbl"
