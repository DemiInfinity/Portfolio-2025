@admin
Feature: Feature flags (T12)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Sub line
    When the admin opens "/feature-flags"
    Then the admin sees that the sub line reads "3 flags, 1 on. Each switches part of the live site."

  Scenario: Maintenance asks first; Cancel leaves it off
    When the admin opens "/feature-flags"
    And the admin clicks "Maintenance mode"
    Then the admin sees that the confirm reads "Turn on maintenance mode?"
    And the admin sees that the confirm text includes "Every visitor to demitaylornimmo.com sees the maintenance page until you turn it off. The admin area keeps working."
    When the admin clicks "Cancel"
    Then the admin sees that no PUT request was sent to "/feature-flags/1"
    And the admin sees that the switch "Maintenance mode" is off

  Scenario: Turning maintenance on
    When the admin opens "/feature-flags"
    And the admin clicks "Maintenance mode"
    And the admin clicks the confirm button "Turn it on"
    Then the admin sees that the last PUT to "/feature-flags/1" had the body:
      """
      { "enabled": true }
      """
    And the admin sees that the last PUT to "/feature-flags/1" had no "name" key
    And the admin sees "Maintenance mode is on. Visitors see the maintenance page instead of the site."
    And the admin sees that the top bar status reads "Maintenance page showing"
    And the admin sees "Back soon"

  Scenario: Turning maintenance off from the notice
    Given the admin fixture has "flags[0].enabled" set to "true"
    When the admin opens "/feature-flags"
    And the admin clicks "Turn it off"
    Then the admin sees that the toast reads "Maintenance mode off. The site is live."
    And the admin sees that the top bar status reads "Live"

  Scenario: Turning off Open to work removes the pill from the preview
    When the admin opens "/feature-flags"
    Then the admin sees the preview shows the "Open to work" pill
    When the admin clicks "Open to work badge"
    Then the admin sees that the toast reads "Open to work badge off"
    And the admin sees the preview does not show the "Open to work" pill

  Scenario: New flag key validation
    When the admin opens "/feature-flags"
    And the admin clicks the header button "New flag"
    And the admin types "Show Reviews" into "Key"
    And the admin clicks "Create flag"
    Then the admin sees that the field "Key" shows the error "Lower case letters, numbers and underscores, like show_reviews."
    And the admin sees that no POST request was sent to "/feature-flags"
    When the admin replaces "Key" with "open_to_work"
    And the admin clicks "Create flag"
    Then the admin sees "A flag called open_to_work already exists."
    And the admin sees that no POST request was sent to "/feature-flags"
    When the admin replaces "Key" with "show_reviews"
    And the admin types "Shows reviews on the home page." into "What it controls"
    And the admin clicks "Create flag"
    Then the admin sees that the last POST to "/feature-flags" had the body:
      """
      { "name": "show_reviews", "description": "Shows reviews on the home page." }
      """
    And the admin sees that the last POST to "/feature-flags" had no "enabled" key
    And the admin sees that the toast reads "Created show_reviews, off"
    And the admin sees "Show reviews"

  Scenario: A server 409 on create shows under Key
    Given the admin API answers POST "/feature-flags" with status 409 and body "{\"success\":false,\"error\":\"A flag called x_y already exists.\"}"
    When the admin opens "/feature-flags"
    And the admin clicks the header button "New flag"
    And the admin types "x_y" into "Key"
    And the admin clicks "Create flag"
    Then the admin sees that the field "Key" shows the error "A flag called x_y already exists."
    And the admin sees that a dialog titled "New flag" is open
