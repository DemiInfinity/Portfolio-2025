@admin
Feature: Dashboard (T5, T21)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in
    And the admin fixture has every message read

  Scenario: KPI values and captions from the fixture
    When the admin opens "/"
    Then the admin sees that the KPIs read:
      | Projects       | 3 | 1 featured on the home page    |
      | Blog posts     | 4 | 4 published, latest 1 Apr 2026 |
      | Roles          | 4 | Current: Cintra HR & Payrolls  |
      | Courses        | 4 | 13% average progress           |
      | Certifications | 0 | None listed yet                |

  Scenario: Needs attention is computed from the fixture
    When the admin opens "/"
    Then the admin sees that the Needs attention count reads "4"
    And the admin sees that the Needs attention rows read, in order:
      | The Complete Cypress v13 Course passed its target | Target was December 2025. Progress is 15%.                         | Overdue        | Update progress |
      | No CV PDF yet                                     | The Download CV button stays hidden on the site until one is built. | Hidden on site | Build the CV    |
      | No certifications listed                          | The CV leaves out its Certifications section while this is empty.   | Empty          | Add one         |
      | Last post was 209 days ago                        | 1 Apr 2026.                                                         | 209 days       | Write a post    |
    And the admin sees that the sub line reads "1 course is past its target and no CV PDF is built yet, so the Download CV button is hidden."

  Scenario: A failed CV build shows its own attention item
    Given the admin fixture has "cvStatus" set to "{\"state\":\"failed\",\"generatedAt\":\"2026-10-20T10:00:00Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":\"Font missing.\",\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    When the admin opens "/"
    Then the admin sees that the Needs attention rows include "CV PDF build failed" with "Visitors still download the previous version. Font missing." and the pill "Failed"
    And the admin sees that the CV PDF row reads "Build failed"

  Scenario: The CV status endpoint missing (404) degrades quietly
    Given the admin API answers GET "/cv/status" with status 404 and body "{\"success\":false,\"error\":\"Not found\"}"
    When the admin opens "/"
    Then the admin sees that the Needs attention count reads "3"
    And the admin does not see "No CV PDF yet"

  Scenario: Build the CV goes to Settings
    When the admin opens "/"
    And the admin clicks "Build the CV"
    Then the admin sees that the URL path is "/settings"

  Scenario: Write a post opens the New post dialog on /blog
    When the admin opens "/"
    And the admin clicks the header button "Write a post"
    Then the admin sees that the URL path is "/blog"
    And the admin sees that a dialog titled "New post" is open

  Scenario: Regenerate CV shows Rebuilding then Rebuilt
    Given the admin API delays POST "/cv/regenerate" by 1500 ms
    When the admin opens "/"
    And the admin clicks "Regenerate CV"
    Then the admin sees that the CV PDF row reads "Rebuilding"
    And the admin sees that a POST request was sent to "/cv/regenerate"
    And the admin sees that the CV PDF row reads "Rebuilt 09:00"
    And the admin sees that the toast reads "CV rebuilt"

  Scenario: Toggling Open to work badge
    When the admin opens "/"
    And the admin clicks "Open to work badge"
    Then the admin sees that the last PUT to "/feature-flags/2" had the body:
      """
      { "enabled": false }
      """
    And the admin sees that the toast reads "Open to work badge off"

  Scenario: Maintenance mode asks first and Cancel sends nothing
    When the admin opens "/"
    And the admin clicks "Maintenance mode"
    Then the admin sees that the confirm reads "Turn on maintenance mode?"
    When the admin clicks "Cancel"
    Then the admin sees that no PUT request was sent to "/feature-flags/1"
    And the admin sees that the switch "Maintenance mode" is off

  Scenario: A missing flag hides its switch
    Given the admin fixture has "flags" set to "[{\"id\":2,\"name\":\"open_to_work\",\"description\":\"x\",\"enabled\":true}]"
    When the admin opens "/"
    Then the admin sees "Open to work badge"
    And the admin does not see "List Marbl"

  Scenario: Dashboard reads projects from the admin endpoint
    When the admin opens "/"
    Then the admin sees that a GET request was sent to "/projects/admin/all"
    And the admin sees that no GET request was sent to "/projects"

  Scenario: At 390px the KPI strip is 2 columns
    Given the admin screen is 390 by 844
    When the admin opens "/"
    Then the admin sees that the KPI strip has 2 columns
    And the admin sees that the page has no horizontal scroll
    And the admin sees that the Needs attention pills are hidden

  Scenario: Unread messages lead Needs attention (H-24), count only
    Given the admin fixture has "messages[1].read" set to "false"
    And the admin fixture has "messages[0].read" set to "false"
    When the admin opens "/"
    Then the admin sees that the Needs attention count reads "5"
    And the admin sees the first Needs attention row reads "2 unread messages" with "Read messages"
    And the admin sees no text "frontend role at a fintech" on the page
    When the admin clicks "Read messages"
    Then the admin sees that the URL path is "/messages"
