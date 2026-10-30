@admin
Feature: Learning (T11)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Overdue pill and sub line
    When the admin opens "/learning"
    Then the admin sees "Past its December 2025 target"
    And the admin sees that the sub line reads "4 courses in progress, 13% on average. The Complete Cypress v13 Course passed its December 2025 target."

  Scenario: The inline stepper saves at once
    When the admin opens "/learning"
    And the admin steps "Up 5%" for "The Complete Cypress v13 Course: Automation Testing Bootcamp"
    Then the admin sees the progress for "The Complete Cypress v13 Course: Automation Testing Bootcamp" reads "20%"
    And the admin sees that the last PUT to "/learning/3" had the body:
      """
      { "progress": 20 }
      """
    And the admin sees that the toast reads "Saved: 20%"

  Scenario: A failed stepper save rolls back
    Given the admin API answers PUT "/learning/3" with status 500 and body "{\"success\":false,\"error\":\"Server error\"}"
    When the admin opens "/learning"
    And the admin steps "Up 5%" for "The Complete Cypress v13 Course: Automation Testing Bootcamp"
    Then the admin sees that the toast reads "Couldn't save progress."
    And the admin sees the progress for "The Complete Cypress v13 Course: Automation Testing Bootcamp" reads "15%"

  Scenario: Skills tab
    When the admin opens "/learning"
    And the admin clicks the tab starting "Skills"
    Then the admin sees that the URL search is "?tab=skills"
    And the admin sees the header button "Add skill"
    And the admin sees that there are 2 visible rows
    And the admin sees every visible row has the pill "Advanced"

  Scenario: Remove course confirm names the course
    When the admin opens "/learning"
    And the admin clicks "Edit The AI Engineer Course 2025: Complete AI Engineer Bootcamp"
    And the admin clicks "Remove course"
    Then the admin sees that the confirm reads "Remove The AI Engineer Course 2025: Complete AI Engineer Bootcamp?"
    When the admin clicks the confirm button "Remove course"
    Then the admin sees that a DELETE request was sent to "/learning/4"
    And the admin sees that the toast reads "Removed"

  Scenario: Stepper and Edit stay visible at 390px
    Given the admin screen is 390 by 844
    When the admin opens "/learning"
    Then the admin sees the stepper and Edit for "The Complete Cypress v13 Course: Automation Testing Bootcamp" are visible and the bar is hidden
    And the admin sees the pill "Past its December 2025 target" in full
    And the admin sees that the page has no horizontal scroll
