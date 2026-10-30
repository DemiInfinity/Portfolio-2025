@admin
Feature: Settings (T13): CV PDF status, profile and password

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Never built
    When the admin opens "/settings"
    Then the admin sees that the sub line reads "No CV PDF yet, so the Download CV button is hidden on the site."
    And the admin sees "No CV PDF yet"
    And the admin sees "Download CV hidden"
    And the admin sees the page has no file input

  Scenario: Build it now
    Given the admin API delays POST "/cv/regenerate" by 1500 ms
    And the admin API answers POST "/cv/regenerate" with status 200 and body "{\"success\":true,\"data\":{\"state\":\"idle\",\"generatedAt\":\"2026-10-27T09:41:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1\",\"size\":188416}}"
    And the admin API returns the CV status "{\"state\":\"idle\",\"generatedAt\":\"2026-10-27T09:41:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1\",\"size\":188416}" after a rebuild
    When the admin opens "/settings"
    And the admin clicks "Build it now"
    Then the admin sees that the "Build it now" control is disabled
    And the admin sees "Rebuilding with your latest changes"
    And the admin sees that the toast reads "CV rebuilt"
    And the admin sees "Rebuilt today, 09:41 · 184 KB"
    And the admin sees the "Download" link goes to "https://cdn.example.com/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1"
    And the admin sees that the sub line reads "Your CV PDF is live behind the Download CV button."

  Scenario: Building state polls every 3 s and stops when idle
    Given the admin fixture has "cvStatus" set to "{\"state\":\"building\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":\"2026-10-27T08:59:00.000Z\",\"error\":null,\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    When the admin opens "/settings"
    Then the admin sees "Rebuilding with your latest changes"
    And the admin sees that the "Regenerate" control is disabled
    When the admin sees that the CV status becomes idle after the next poll
    Then the admin sees "Rebuilt 20 Oct 2026 · 184 KB" within 8 seconds
    And the admin sees the CV status stops polling

  Scenario: Pending state also shows Rebuilding
    Given the admin fixture has "cvStatus" set to "{\"state\":\"pending\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":\"2026-10-27T08:59:00.000Z\",\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    When the admin opens "/settings"
    Then the admin sees "Rebuilding with your latest changes"
    And the admin sees that the "Regenerate" control is disabled

  Scenario: Failed state
    Given the admin fixture has "cvStatus" set to "{\"state\":\"failed\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":\"Font missing.\",\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    When the admin opens "/settings"
    Then the admin sees "The last rebuild failed. Visitors still get the previous PDF."
    And the admin sees "Font missing."
    And the admin sees that the sub line reads "The last CV build failed. Visitors get the previous PDF."
    When the admin clicks "Try again"
    Then the admin sees that a POST request was sent to "/cv/regenerate"
    And the admin sees that the toast reads "CV rebuilt"

  Scenario: Regenerate answered 409 and 500
    Given the admin fixture has "cvStatus" set to "{\"state\":\"idle\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    And the admin API answers POST "/cv/regenerate" with status 409 and body "{\"success\":false,\"error\":\"A CV build is already running\",\"data\":{\"state\":\"building\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}}"
    When the admin opens "/settings"
    And the admin clicks "Regenerate"
    Then the admin sees that the toast reads "A rebuild is already running."

  Scenario: Regenerate answered 500
    Given the admin fixture has "cvStatus" set to "{\"state\":\"idle\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":null,\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}"
    And the admin API answers POST "/cv/regenerate" with status 500 and body "{\"success\":false,\"error\":\"CV build failed\",\"data\":{\"state\":\"failed\",\"generatedAt\":\"2026-10-20T10:00:00.000Z\",\"requestedAt\":null,\"startedAt\":null,\"error\":\"Out of memory.\",\"pdfUrl\":\"https://cdn.example.com/cv.pdf\",\"size\":188416}}"
    When the admin opens "/settings"
    And the admin clicks "Regenerate"
    Then the admin sees that the toast reads "CV build failed"
    And the admin sees "The last rebuild failed. Visitors still get the previous PDF."

  Scenario: The status endpoint is missing (404 fallback)
    Given the admin API answers GET "/cv/status" with status 404 and body "{\"success\":false,\"error\":\"Not found\"}"
    When the admin opens "/settings"
    Then the admin sees "CV build status isn't available yet."
    And the admin sees the page has no file input

  Scenario: A wrong current password stays signed in
    Given the admin API answers PUT "/auth/change-password" with status 400 and body "{\"success\":false,\"error\":\"Current password is incorrect\"}"
    When the admin opens "/settings"
    And the admin types "not-my-password" into "Current password"
    And the admin types "abcdef12" into "New password"
    And the admin types "abcdef12" into "Confirm new password"
    And the admin clicks "Change password"
    Then the admin sees that the field "Current password" shows the error "Your current password is wrong."
    And the admin sees that the h1 reads "Settings"
    And the admin sees that no POST request was sent to "/auth/logout"

  Scenario: Profile save
    When the admin opens "/settings"
    And the admin replaces "Name" with "Demi T. Nimmo"
    And the admin clicks "Save profile"
    Then the admin sees that the last PUT to "/auth/profile" had the body:
      """
      { "name": "Demi T. Nimmo" }
      """
    And the admin sees that the toast reads "Profile saved"
