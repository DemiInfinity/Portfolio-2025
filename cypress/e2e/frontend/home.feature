@site
Feature: Home page (F-11, F-9, D-3, D-6 badge, D-8 Download CV)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-11 AC1 hero heading
    When the visitor opens "/"
    Then the page heading is "Hi, I’m Demi Taylor Nimmo"

  Scenario: F-11 AC2 open_to_work on shows the badge
    Given the site flag "open_to_work" is on
    When the visitor opens "/"
    Then the hero shows "Open to work"

  Scenario: F-11 AC2 open_to_work off hides the badge
    Given the site flag "open_to_work" is off
    When the visitor opens "/"
    And the visitor waits for the flag check
    Then the page does not show "Open to work"

  Scenario: F-11 AC2 badge stays hidden while the flag is still loading
    Given the site flag "open_to_work" is on
    And the browser flag check for "open_to_work" takes 4000 ms
    When the visitor opens "/"
    Then the page does not show "Open to work"
    And the hero shows "Open to work"

  Scenario: F-11 AC3 featured project first, then the most recent, 3 cards
    Given the site mock "projects" is the fixture "projects-five-featured4.json"
    When the visitor opens "/"
    Then Recent work shows the cards "Project Four, Project One, Project Two"
    And each Recent work card links to its "/projects/{slug}" with its title

  Scenario: F-11 AC3 no featured project: the 3 most recent
    Given the site mock "projects" is the fixture "projects-five-none-featured.json"
    When the visitor opens "/"
    Then Recent work shows the cards "Project One, Project Two, Project Three"

  Scenario: F-11 hidden projects never appear in Recent work (D-4)
    When the visitor opens "/"
    Then the page does not show "Secret Idea"
    And the page does not show "Hidden Thing"

  Scenario: F-11 empty project list shows the empty state
    Given the site mock "projects" is:
      """
      []
      """
    When the visitor opens "/"
    Then the visitor sees "New projects are on the way."

  Scenario: F-11 AC4 colourway switches on Home only; the rest of the site stays Lilac
    When the visitor opens "/"
    And the visitor clicks "Rose"
    Then the swatch "Rose" is pressed
    And the visitor sees "Colourway: Rose"
    When the visitor clicks "About" in the "Main" nav
    Then the URL path is "/about"
    And the CSS variable "--b1" on body is "#7c3aed"

  Scenario: F-11 AC4 colourway is Lilac on /about after a full reload too
    When the visitor opens "/"
    And the visitor clicks "Moonlight"
    And the visitor opens "/about"
    Then the CSS variable "--b1" on body is "#7c3aed"

  Scenario: F-11 AC5 contact email link
    When the visitor opens "/"
    Then the page has a link "demi.21@outlook.com" to "mailto:demi.21@outlook.com"

  Scenario: F-11 AC6 and F-19 AC8 Download CV uses the generated PDF URL as given
    Given the site resume is available at "https://x/cv.pdf?v=1"
    When the visitor opens "/"
    Then the "Download CV" link points to "https://x/cv.pdf?v=1" with a download attribute

  Scenario: F-11 AC6 no Download CV when unavailable
    Given the site resume is unavailable
    When the visitor opens "/"
    And the visitor waits for the resume check
    Then the page does not show "Download CV"

  Scenario: F-11 AC7 illustration
    When the visitor opens "/"
    Then there is an img role whose name contains "interface, API and database"

  Scenario: F-9 AC2 projects 500: hero still renders, Recent work offers Retry
    Given the site mock answers "GET /api/projects" with status 500
    When the visitor opens "/"
    Then the page heading is "Hi, I’m Demi Taylor Nimmo"
    And the "Retry" button is visible

  Scenario: F-11 stats fall back when work history and education fail
    Given the site mock answers "GET /api/work-history" with status 500
    And the site mock answers "GET /api/education" with status 500
    When the visitor opens "/"
    Then the visitor sees "Girly code, serious craft"
    And the visitor sees "BSc"

  Scenario Outline: F-11 hero 3D illustration still renders at <screen> after the class rename
    Given the visitor uses a <screen> screen
    When the visitor opens "/"
    Then the hero illustration is at least 150px wide and tall

    Examples:
      | screen  |
      | desktop |
      | phone   |
