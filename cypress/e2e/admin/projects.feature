@admin
Feature: Projects (T6, T20, T21)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Sub line
    When the admin opens "/projects"
    Then the admin sees that the sub line reads "3 projects, 1 featured on the home page."

  Scenario: Search by technology updates the filter counts
    When the admin opens "/projects"
    And the admin types "sqlite" into "Search projects"
    Then the admin sees that the rows read, in order:
      | Infinity Tracker |
    And the admin sees that the segment "All" shows the count "1"
    And the admin sees that the segment "In development" shows the count "1"
    And the admin sees that the segment "Ideas" shows the count "0"
    And the admin sees that the segment "Completed" shows the count "0"

  Scenario: Status filter, empty state and Clear filters
    When the admin opens "/projects"
    And the admin clicks the segment "Completed"
    Then the admin sees that the rows read, in order:
      | This portfolio |
    When the admin clicks the segment "Ideas"
    Then the admin sees "No projects with this status."
    When the admin clicks "Clear filters"
    Then the admin sees that there are 3 visible rows

  Scenario: New project needs a title and fills the slug
    When the admin opens "/projects"
    And the admin clicks the header button "New project"
    And the admin clicks "Create project"
    Then the admin sees that the field "Title" shows the error "Give the project a title."
    And the admin sees that no POST request was sent to "/projects"
    When the admin types "My New App!" into "Title"
    Then the admin sees that the field "URL slug" has the value "my-new-app"

  Scenario: Featured hint names the current spotlight
    When the admin opens "/projects"
    And the admin clicks "Edit Infinity Tracker"
    And the admin flips the switch "Feature on the home page"
    Then the admin sees "Replaces LunaLore in the home page spotlight."

  Scenario: Saving with Featured on leaves one Featured row
    When the admin opens "/projects"
    And the admin clicks "Edit Infinity Tracker"
    And the admin flips the switch "Feature on the home page"
    And the admin clicks "Save changes"
    Then the admin sees that the last PUT to "/projects/2" had the body:
      """
      { "featured": true }
      """
    And the admin sees that the toast reads "Saved Infinity Tracker"
    And the admin sees that exactly 1 row reads "Featured"

  Scenario: Delete confirm names the project
    When the admin opens "/projects"
    And the admin clicks "Edit LunaLore"
    And the admin clicks "Delete project"
    Then the admin sees that the confirm reads "Delete LunaLore?"
    And the admin sees that the confirm text includes "It disappears from the Projects page, the home page and the CV. This can't be undone."
    When the admin clicks "Keep it"
    Then the admin sees that no DELETE request was sent to "/projects/1"
    When the admin clicks "Delete project"
    And the admin clicks the confirm button "Delete project"
    Then the admin sees that a DELETE request was sent to "/projects/1"
    And the admin sees that the toast reads "Deleted LunaLore"
    And the admin sees that no dialog is open

  Scenario: Role and platform load and save
    When the admin opens "/projects"
    And the admin clicks "Edit LunaLore"
    Then the admin sees that the field "Your role" has the value "Solo: design, frontend, backend"
    And the admin sees that the field "Platform" has the value "Desktop app and web"
    When the admin clears "Your role"
    And the admin clears "Platform"
    And the admin clicks "Save changes"
    Then the admin sees that the last PUT to "/projects/1" had the body:
      """
      { "role": null, "platform": null }
      """

  Scenario: A server field error shows under its field
    Given the admin API answers PUT "/projects/2" with status 400 and body "{\"success\":false,\"error\":\"Invalid input\",\"details\":[{\"path\":\"slug\",\"msg\":\"That slug is taken.\"}]}"
    When the admin opens "/projects"
    And the admin clicks "Edit Infinity Tracker"
    And the admin clicks "Save changes"
    Then the admin sees that the field "URL slug" shows the error "That slug is taken."
    And the admin sees that a dialog titled "Edit Infinity Tracker" is open

  Scenario: The list and editor use the admin endpoints
    When the admin opens "/projects"
    And the admin clicks "Edit LunaLore"
    Then the admin sees that a GET request was sent to "/projects/admin/all"
    And the admin sees that a GET request was sent to "/projects/admin/1"
    And the admin sees that no GET request was sent to "/projects"
    And the admin sees that no GET request was sent to "/projects/1"

  Scenario: Hidden and idea projects say they are not on the site
    Given the admin fixture has "projects[1].show_on_site" set to "false"
    And the admin fixture has "projects[2].status" set to "\"ideas\""
    When the admin opens "/projects"
    Then the admin sees that the row "Infinity Tracker" reads "/projects/infinity-tracker · not on the site"
    And the admin sees that the row "This portfolio" reads "/projects/portfolio-website · not on the site"
    And the admin sees that the row "LunaLore" reads "/projects/lunalore"

  Scenario: Turning Show on site off saves show_on_site false
    When the admin opens "/projects"
    And the admin clicks "Edit LunaLore"
    And the admin flips the switch "Show on site"
    And the admin clicks "Save changes"
    Then the admin sees that the last PUT to "/projects/1" had the body:
      """
      { "show_on_site": false }
      """

  Scenario: Case study tab shows the saved case study
    When the admin opens "/projects?edit=1"
    And the admin clicks "Case study"
    Then the admin sees that the field "Overview" has the value "LunaLore helps VTubers write their character lore."
    And the admin sees that the case study has 3 "Phase" items

  Scenario: The project dialog works at 390px
    Given the admin screen is 390 by 844
    When the admin opens "/projects?edit=1"
    Then the admin sees that the page has no horizontal scroll
    And the admin sees that the dialog tabs fit or scroll inside the dialog
