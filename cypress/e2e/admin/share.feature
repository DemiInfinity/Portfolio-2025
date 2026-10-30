@admin
Feature: Share on LinkedIn (AdminShare)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Share shows on published posts only
    Given the admin fixture has "blog[3].published" set to "false"
    When the admin opens "/blog"
    Then the admin sees a Share button for "How I Built Automatic Updates Into a Desktop App (Without the Headache)"
    And the admin sees no Share button for "The Reality of Micro Frontend Adoption: Why MFEs Are Still Finding Their Footing"

  Scenario: Share shows on visible projects only
    Given the admin fixture has "projects[1].show_on_site" set to "false"
    And the admin fixture has "projects[2].status" set to "\"ideas\""
    When the admin opens "/projects"
    Then the admin sees a Share button for "LunaLore"
    And the admin sees no Share button for "Infinity Tracker"
    And the admin sees no Share button for "This portfolio"

  Scenario: Starter texts, hashtags and the preview
    Given the admin fixture has "blog[0].tags" set to "[\"Velopack\", \"C# / .NET\", \"AWS Lambda\", \"velopack\", \" \"]"
    When the admin opens "/blog"
    And the admin clicks "Share How I Built Automatic Updates Into a Desktop App (Without the Headache) on LinkedIn"
    Then the admin sees a dialog titled "Share on LinkedIn" is open or the dialog stays open
    And the admin sees the share text is:
      """
      New post: How I Built Automatic Updates Into a Desktop App (Without the Headache)

      Excerpt for automatic-updates-desktop-app.

      Read it here: https://www.demitaylornimmo.com/blog/automatic-updates-desktop-app

      #Velopack #CNET #AWSLambda
      """
    And the admin sees the starter "New post" is pressed
    And the admin sees the share preview shows "How I Built Automatic Updates Into a Desktop App (Without the Headache)" and "demitaylornimmo.com"
    When the admin clicks "Lesson learned"
    Then the admin sees the share text starts with "Something I learned the hard way, written up:"
    When the admin clicks "Just the link"
    Then the admin sees the share text is:
      """
      How I Built Automatic Updates Into a Desktop App (Without the Headache)
      https://www.demitaylornimmo.com/blog/automatic-updates-desktop-app
      """
    When the admin adds " edited" to the share text
    Then the admin sees no starter is pressed

  Scenario: The 3,000 character counter
    When the admin opens "/blog"
    And the admin clicks "Share How I Built Automatic Updates Into a Desktop App (Without the Headache) on LinkedIn"
    And the admin sets the share text to 3001 characters
    Then the admin sees "3,001 / 3,000 characters"
    And the admin sees the share counter is marked over

  Scenario: Copy text and open LinkedIn
    Given the admin's clipboard works
    When the admin opens "/blog"
    And the admin clicks "Share How I Built Automatic Updates Into a Desktop App (Without the Headache) on LinkedIn"
    And the admin clicks "Copy text and open LinkedIn"
    Then the admin sees that the toast reads "Text copied. Paste it into your LinkedIn post."
    And the admin sees the clipboard got the share text
    And the admin sees LinkedIn opened at "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.demitaylornimmo.com%2Fblog%2Fautomatic-updates-desktop-app"

  Scenario: Copy text only
    Given the admin's clipboard works
    When the admin opens "/projects"
    And the admin clicks "Share LunaLore on LinkedIn"
    Then the admin sees the share text starts with "New project: LunaLore"
    When the admin clicks "Copy text only"
    Then the admin sees that the toast reads "Post text copied"
    And the admin sees LinkedIn was not opened

  Scenario: The clipboard fails
    Given the admin's clipboard fails
    When the admin opens "/blog"
    And the admin clicks "Share How I Built Automatic Updates Into a Desktop App (Without the Headache) on LinkedIn"
    And the admin clicks "Copy text and open LinkedIn"
    Then the admin sees that the toast reads "Couldn't copy. The text is selected, so press Ctrl+C (Cmd+C on a Mac) to copy it."
    And the admin sees the share text is focused and selected
    And the admin sees LinkedIn was not opened
