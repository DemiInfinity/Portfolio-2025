@admin @admin-screenshots
Feature: Admin screenshots for the visual review (1440 and 390)

  Scenario Outline: <page> at <w>
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in
    And the admin screen is <w> by <h>
    When the admin opens "<path>"
    Then the admin takes a full-page screenshot named "<w>-<page>"

    Examples:
      | page        | path            | w    | h    |
      | dashboard   | /               | 1280 | 900  |
      | about       | /about          | 1280 | 900  |
      | projects    | /projects       | 1280 | 900  |
      | project-dlg | /projects?edit=1| 1280 | 900  |
      | blog        | /blog           | 1280 | 900  |
      | work        | /work-history   | 1280 | 900  |
      | education   | /education      | 1280 | 900  |
      | certs       | /certifications | 1280 | 900  |
      | learning    | /learning       | 1280 | 900  |
      | analytics   | /analytics      | 1280 | 900  |
      | flags       | /feature-flags  | 1280 | 900  |
      | settings    | /settings       | 1280 | 900  |
      | dashboard   | /               | 390  | 844  |
      | about       | /about          | 390  | 844  |
      | projects    | /projects       | 390  | 844  |
      | project-dlg | /projects?edit=1| 390  | 844  |
      | blog        | /blog           | 390  | 844  |
      | work        | /work-history   | 390  | 844  |
      | education   | /education      | 390  | 844  |
      | certs       | /certifications | 390  | 844  |
      | learning    | /learning       | 390  | 844  |
      | analytics   | /analytics      | 390  | 844  |
      | flags       | /feature-flags  | 390  | 844  |
      | settings    | /settings       | 390  | 844  |

  Scenario Outline: sign in at <w>
    Given the admin API serves the content fixture
    And the admin screen is <w> by <h>
    When the admin opens "/"
    Then the admin takes a full-page screenshot named "<w>-login"

    Examples:
      | w    | h   |
      | 1280 | 900 |
      | 390  | 844 |
