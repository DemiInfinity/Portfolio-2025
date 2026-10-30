@admin
Feature: Work history (T8)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Rows, ranges and lengths
    When the admin opens "/work-history"
    Then the admin sees that the rows read, in order:
      | Software Developer        |
      | Software Developer        |
      | Mid Software Developer    |
      | Junior Software Developer |
    And the admin sees row 1 includes "Current", "Cintra HR & Payrolls", "Aug 2025 – now" and "1 yr 3 mos"
    And the admin sees row 2 includes "PASS Ltd", "Jun – Aug 2024" and "3 mos"

  Scenario: Sub line
    When the admin opens "/work-history"
    Then the admin sees that the sub line reads "4 roles at 3 companies, newest first. Shown on Experience and the CV."

  Scenario: Impact highlights load and save one per line
    When the admin opens "/work-history"
    And the admin clicks "Edit Software Developer at PASS Ltd"
    Then the admin sees that the field "Impact highlights" has the value "−80% manual update effort\n−60% lookup time on calls"
    When the admin clicks "Save changes"
    Then the admin sees that the last PUT to "/work-history/2" had the body:
      """
      { "highlights": ["−80% manual update effort", "−60% lookup time on calls"] }
      """
    And the admin sees that the toast reads "Saved Software Developer at PASS Ltd"

  Scenario: A 61-character highlight is refused
    When the admin opens "/work-history"
    And the admin clicks "Edit Software Developer at PASS Ltd"
    And the admin types "1234567890123456789012345678901234567890123456789012345678901" into "Impact highlights"
    And the admin clicks "Save changes"
    Then the admin sees "Keep each highlight to 60 characters."
    And the admin sees that no PUT request was sent to "/work-history/2"

  Scenario: Seven highlights are refused
    When the admin opens "/work-history"
    And the admin clicks "Edit Software Developer at PASS Ltd"
    And the admin types into "Impact highlights":
      """
      a
      b
      c
      d
      e
      f
      g
      """
    And the admin clicks "Save changes"
    Then the admin sees "Up to 6 highlights."
    And the admin sees that no PUT request was sent to "/work-history/2"

  Scenario: A server field error from details[].path
    Given the admin API answers PUT "/work-history/2" with status 400 and body "{\"success\":false,\"error\":\"Invalid input\",\"details\":[{\"path\":\"company\",\"msg\":\"Company is too long.\"}]}"
    When the admin opens "/work-history"
    And the admin clicks "Edit Software Developer at PASS Ltd"
    And the admin clicks "Save changes"
    Then the admin sees that the field "Company" shows the error "Company is too long."
    And the admin sees a dialog titled "Edit role" is open or the dialog stays open

  Scenario: Required fields
    When the admin opens "/work-history"
    And the admin clicks the header button "Add a role"
    And the admin clicks "Add role"
    Then the admin sees that the field "Position" shows the error "Add the job title."
    And the admin sees that the field "Company" shows the error "Add the company."
    And the admin sees that the field "Started" shows the error "Add the start month."
    And the admin sees that no POST request was sent to "/work-history"

  Scenario: Delete confirm names the role
    When the admin opens "/work-history"
    And the admin clicks "Edit Software Developer at PASS Ltd"
    And the admin clicks "Delete role"
    Then the admin sees that the confirm reads "Delete Software Developer at PASS Ltd?"
    When the admin clicks the confirm button "Delete role"
    Then the admin sees that a DELETE request was sent to "/work-history/2"
    And the admin sees that the toast reads "Role deleted"
