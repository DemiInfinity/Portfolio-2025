@site
Feature: Projects list (F-12, F-9, D-4)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-12 AC1 one section per project, h2 = title, API order
    Given the site mock "projects" is the fixture "projects-three.json"
    When the visitor opens "/projects"
    Then the page heading is "My projects"
    And the project section headings are "Alpha, Beta, Gamma"

  Scenario: F-12 AC2 every Read the case study goes to /projects/{slug}
    Given the site mock "projects" is the fixture "projects-three.json"
    When the visitor opens "/projects"
    Then the case study buttons link to "/projects/alpha, /projects/beta, /projects/gamma"

  Scenario: F-12 AC3 feature checklist from feature_titles; [] shows none
    Given the site mock "projects" is the fixture "projects-three.json"
    When the visitor opens "/projects"
    Then the section "Beta" lists the features "Live sync, Offline mode, Dark theme"

  Scenario: F-12 AC3 feature_titles [] shows no checklist
    Given the site mock "projects" is the fixture "projects-three-beta-empty.json"
    When the visitor opens "/projects"
    Then the section "Beta" has no feature checklist

  Scenario: F-12 AC3 checklist hidden when feature_titles is missing (pre-migration)
    Given the site mock "projects" is the fixture "projects-three-premigration.json"
    When the visitor opens "/projects"
    Then the section "Beta" has no feature checklist
    And the project section headings are "Alpha, Beta, Gamma"

  Scenario: F-12 AC4 Let's talk opens contact
    When the visitor opens "/projects"
    And the visitor clicks "Let’s talk"
    Then the dialog "Let’s build something" is open

  Scenario: F-12 AC5 empty list shows an empty message
    Given the site mock "projects" is:
      """
      []
      """
    When the visitor opens "/projects"
    Then the page heading is "My projects"
    And the page shows an empty projects message

  Scenario: F-12 AC6 and D-4 hidden or ideas project slugs show the not-found page
    When the visitor opens "/projects/secret-idea"
    Then the visitor sees the not-found page with a link home
    When the visitor opens "/projects/hidden-thing"
    Then the visitor sees the not-found page with a link home

  Scenario: D-4 the list shows only what the API returns (ideas and hidden left out by the server)
    When the visitor opens "/projects"
    Then the project section headings are "LunaLore, Marbl, Sparky Venture, Rebel Verify"

  Scenario: F-9 AC2 projects 500 shows the error frame
    Given the site mock answers "GET /api/projects" with status 500
    When the visitor opens "/projects"
    Then the visitor sees "Couldn't load projects"
    And the "Try again" button is visible
