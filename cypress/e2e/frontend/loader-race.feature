@site @loader-race
Feature: F-9 loader during client navigation, with the route prefetch finished or still pending
  The requirement is visible feedback straight after the click until the page is ready.
  When the URL changes is Next's router's business and is not asserted (see qa-frontend.md, B-2 re-test).

  Background:
    Given the visitor uses a desktop screen
    And the site mock answers "GET /api/learning" slowly after 4000 ms

  Scenario: F-9 loader shows when the route prefetch has finished before the click
    When the visitor opens "/"
    And the visitor waits until the route "/learning" has been prefetched
    And the visitor clicks "Learning" in the "Footer" nav
    Then the loader is in the main landmark within 1000 ms of the click
    And the page heading eventually is "My learning journey"
    And the URL path is "/learning"

  Scenario: F-9 loader shows when the click comes before the route prefetch has answered
    Given the browser holds route prefetches of "/learning" for 400 ms
    When the visitor opens "/"
    And the visitor clicks "Learning" in the "Footer" nav
    Then the loader is in the main landmark within 1000 ms of the click
    And the loader stays until the page heading is "My learning journey"
    And the URL path is "/learning"

  Scenario: F-9 immediate click straight after load
    When the visitor opens "/"
    And the visitor clicks "Learning" in the "Footer" nav
    Then the loader is in the main landmark within 1000 ms of the click
    And the loader stays until the page heading is "My learning journey"
