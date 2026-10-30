@site @loader-race
Feature: F-9 loader during client navigation, with the route prefetch finished or still pending

  Background:
    Given the visitor uses a desktop screen
    And the site mock answers "GET /api/learning" slowly after 4000 ms

  Scenario: F-9 loader shows when the route prefetch has finished before the click
    When the visitor opens "/"
    And the visitor waits until the route "/learning" has been prefetched
    And the visitor clicks "Learning" in the "Footer" nav
    Then the main landmark is never empty while "/learning" loads
    And a status region says "Waking the server…"

  Scenario: F-9 loader shows when the click comes before the route prefetch has answered
    Given the browser holds route prefetches of "/learning" for 400 ms
    When the visitor opens "/"
    And the visitor clicks "Learning" in the "Footer" nav
    Then the main landmark is never empty while "/learning" loads
    And a status region says "Waking the server…"

