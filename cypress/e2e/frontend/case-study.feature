@site
Feature: Project case study (F-13, D-2, H-18)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-13 AC1 hero
    When the visitor opens "/projects/lunalore"
    Then the page heading is "LunaLore"
    And the visitor sees "Case study"
    And the page has a link "← All projects" to "/projects"

  Scenario: F-13 full case study: TOC lists every filled section in order
    When the visitor opens "/projects/lunalore"
    Then the "On this page" links are "#overview, #problem, #process, #architecture, #features, #challenges, #outcome"
    And the legacy content "Old markdown that must not show" is not shown

  Scenario: F-13 AC2 partial case study: TOC has only the filled sections
    Given project "lunalore" has the case study fixture "case-study-partial.json"
    When the visitor opens "/projects/lunalore"
    Then the "On this page" links are "#overview, #problem, #process, #outcome"
    And there is no heading "Architecture"
    And there is no heading "Key features"
    And there is no heading "Challenges"

  Scenario: F-13 AC3 process tabs
    When the visitor opens "/projects/lunalore"
    Then the "Process phases" tablist has 4 tabs
    And tab 1 is selected
    When the visitor clicks tab 3
    Then tab 3 is selected
    And the tab panel shows "Sketching the shelf"
    When the visitor focuses tab 1 and presses ArrowRight
    Then tab 2 has focus

  Scenario: F-13 AC4 how might we inside a blockquote
    When the visitor opens "/projects/lunalore"
    Then a blockquote contains "How might we keep a whole fictional world in one calm place?"

  Scenario: F-13 AC5 challenges: title, then Solution: and the solution
    When the visitor opens "/projects/lunalore"
    Then the challenge "One desktop and web codebase" reads "Solution:" then "A thin platform layer behind one interface."
    And the challenge "Sync conflicts" reads "Solution:" then "Last-writer-wins per field, with history."

  Scenario: F-13 AC6 metric tiles
    When the visitor opens "/projects/lunalore"
    Then the outcome shows the metrics "30%|lower infrastructure costs, 12|writers interviewed, 2|platforms from one codebase"
    And the visitor sees "What I learned"

  Scenario: F-13 AC7 hero meta: Role absent when null, Stack joined with commas
    When the visitor opens "/projects/marbl"
    Then the hero meta has no "Role" item
    And the hero meta "Stack" is "SwiftUI, CloudKit"

  Scenario: F-13 hero meta with every item
    When the visitor opens "/projects/lunalore"
    Then the hero meta "Role" is "Solo: design, frontend, backend"
    And the hero meta "Stack" is "Electron, React, Node.js, PostgreSQL"
    And the hero meta "Platform" is "Desktop app and web"
    And the hero meta "Timeline" is "March 2025"

  Scenario: F-13 AC8 case_study null falls back to the legacy Markdown with a TOC
    When the visitor opens "/projects/marbl"
    Then there is a section with id "overview"
    And the "On this page" links include "#overview"

  Scenario: F-13 legacy fallback for a pre-migration project (no case_study key at all)
    When the visitor opens "/projects/sparky-venture"
    Then the page heading is "Sparky Venture"
    And there is a section with id "overview"

  Scenario: F-13 every case-study field empty also falls back to content
    Given project "lunalore" has the case study:
      """
      { "overview": null, "problem": null, "process": [], "architecture": null, "features": [], "challenges": [], "metrics": [], "learned": null }
      """
    When the visitor opens "/projects/lunalore"
    Then the visitor sees "Old markdown that must not show when case_study exists."

  Scenario: F-13 AC9 Next project follows the list order and wraps
    When the visitor opens "/projects/lunalore"
    Then the Next project band links to "/projects/marbl"
    When the visitor opens "/projects/rebel-verify"
    Then the Next project band links to "/projects/lunalore"

  Scenario: F-13 Next project band hidden when the list fails
    Given the site mock answers "GET /api/projects" with status 500
    When the visitor opens "/projects/lunalore"
    Then the page heading is "LunaLore"
    And the page does not show "Next project"

  Scenario: F-13 AC10 /projects/12 redirects to the slug
    When the visitor opens "/projects/12"
    Then the URL path is "/projects/lunalore"
    And the canonical link ends with "/projects/lunalore"
    And the page has JSON-LD of type "SoftwareApplication"

  Scenario: F-13 GitHub and Live buttons when the URLs exist
    When the visitor opens "/projects/lunalore"
    Then the page has a link containing "GitHub" to "https://github.com/DemiInfinity/lunalore"
    And the page has a link containing "live" to "https://lunalore.app"

  Scenario: F-13 process image alt text from image_alt
    When the visitor opens "/projects/lunalore"
    Then an image with alt "Interview notes" is in the tab panel
