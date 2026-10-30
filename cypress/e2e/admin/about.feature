@admin
Feature: About editor (T18) and Recommendations (T19)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Save is disabled until something changes, then sends the whole object
    When the admin opens "/about"
    Then the admin sees that the "Save changes" control is disabled
    When the admin types "I build software people enjoy using." into "Paragraph 1"
    Then the admin sees that the "Save changes" control is enabled
    When the admin clicks "Save changes"
    Then the admin sees the last PUT to "/content/about" has exactly the keys "intro, looking_for, open_to_work_off_line, cv_headline, cv_profile, cv_ai_workflow, contact"
    And the admin sees the last PUT to "/content/about" has 3 intro paragraphs
    And the admin sees that the toast reads "About saved. The CV rebuilds in a few seconds."

  Scenario: Open to work on shows the looking-for section
    When the admin opens "/about"
    Then the admin sees the About row "What I'm looking for" with the pill "Showing now"
    And the admin sees the About row "When you're not looking" with the pill "Hidden now"

  Scenario: Open to work off shows the softer line
    Given the admin fixture has "flags[1].enabled" set to "false"
    When the admin opens "/about"
    Then the admin sees the About row "What I'm looking for" with the pill "Hidden now. Open to work is off."
    And the admin sees the About row "When you're not looking" with the pill "Showing now"

  Scenario: Leaving with unsaved changes asks first
    When the admin opens "/about"
    And the admin types "Changed." into "Paragraph 1"
    And the admin clicks "Projects" in the sidebar
    Then the admin sees that the confirm reads "Leave without saving?"
    And the admin sees that the confirm text includes "Your changes to the About page will be lost."
    When the admin clicks "Keep editing"
    Then the admin sees that the URL path is "/about"
    When the admin clicks "Projects" in the sidebar
    And the admin clicks "Leave"
    Then the admin sees that the URL path is "/projects"

  Scenario: A server 400 marks the field
    Given the admin API answers PUT "/content/about" with status 400 and body "{\"success\":false,\"error\":\"Invalid input\",\"details\":[{\"path\":\"cv_headline\",\"msg\":\"Invalid value\"}]}"
    When the admin opens "/about"
    And the admin types "x" into "Headline"
    And the admin clicks "Save changes"
    Then the admin sees that the field "Headline" shows the error "Invalid value"
    And the admin sees that the toast reads "Check the highlighted fields."

  Scenario: At 390px the rows stack
    Given the admin screen is 390 by 844
    When the admin opens "/about"
    Then the admin sees the About rows stacked
    And the admin sees that the page has no horizontal scroll

  Scenario: Recommendations list
    When the admin opens "/about"
    Then the admin sees the tab "Recommendations 1"
    When the admin clicks the tab starting "Recommendations"
    Then the admin sees "Adam Mellor · Engineering Manager at 3T Global"
    And the admin sees "On the CV"
    And the admin sees "“Demi is one of the most thoughtful developers I have worked with.”"

  Scenario: Adding, moving and deleting a recommendation
    When the admin opens "/about?tab=recommendations"
    And the admin clicks the header button "Add recommendation"
    And the admin types "A great colleague." into "Quote"
    And the admin types "Jo Bloggs" into "Name"
    And the admin clicks "Add recommendation" in the dialog
    Then the admin sees that the last POST to "/recommendations" had the body:
      """
      { "quote": "A great colleague.", "name": "Jo Bloggs", "show_on_cv": false, "sort_order": 10 }
      """
    And the admin sees that the toast reads "Saved the recommendation from Jo Bloggs"
    And the admin sees the tab "Recommendations 2"
    When the admin clicks "Move Jo Bloggs up"
    Then the admin sees that the last PUT to "/recommendations/2" had the body:
      """
      { "sort_order": 0 }
      """
    And the admin sees that the last PUT to "/recommendations/1" had the body:
      """
      { "sort_order": 10 }
      """
    And the admin sees the first recommendation is from "Jo Bloggs"
    When the admin clicks "Edit recommendation from Jo Bloggs"
    And the admin clicks "Delete recommendation"
    Then the admin sees that the confirm reads "Delete the recommendation from Jo Bloggs?"
    When the admin clicks the confirm button "Delete recommendation"
    Then the admin sees that a DELETE request was sent to "/recommendations/2"
    And the admin sees that the toast reads "Recommendation deleted"

  Scenario: Required recommendation fields
    When the admin opens "/about?tab=recommendations"
    And the admin clicks the header button "Add recommendation"
    And the admin clicks "Add recommendation" in the dialog
    Then the admin sees that the field "Quote" shows the error "Add the quote."
    And the admin sees that the field "Name" shows the error "Add who wrote it."
    And the admin sees that no POST request was sent to "/recommendations"
