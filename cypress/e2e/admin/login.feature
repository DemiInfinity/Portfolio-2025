@admin
Feature: Sign in (T4)

  Background:
    Given the admin API serves the content fixture

  Scenario: Submitting empty shows both errors and sends nothing
    When the admin opens "/"
    And the admin clicks "Sign in"
    Then the admin sees that the field "Email" shows the error "Enter the email you sign in with, like name@example.com."
    And the admin sees that the field "Password" shows the error "Enter your password."
    And the admin sees that no POST request was sent to "/auth/login"

  Scenario: Valid credentials land on the Dashboard
    When the admin opens "/"
    And the admin types "test-admin@example.com" into "Email"
    And the admin types "test-password-123" into "Password"
    And the admin clicks "Sign in"
    Then the admin sees that the last POST to "/auth/login" had the body:
      """
      { "email": "test-admin@example.com", "password": "test-password-123" }
      """
    And the admin sees that the h1 reads "Dashboard"

  Scenario: A wrong password shows the message without a reload
    When the admin opens "/"
    And the admin types "test-admin@example.com" into "Email"
    And the admin types "wrong-password" into "Password"
    And the admin clicks "Sign in"
    Then the admin sees that the sign-in alert reads "That email and password don't match. Try again."
    And the admin sees that the URL path is "/"
    And the admin sees that the page did not reload
    And the admin sees that the field "Email" has the value "test-admin@example.com"
    And the admin sees that the field "Password" has the value ""

  Scenario: Signing in shows the busy state
    Given the admin API delays POST "/auth/login" by 1500 ms
    When the admin opens "/"
    And the admin types "test-admin@example.com" into "Email"
    And the admin types "test-password-123" into "Password"
    And the admin clicks "Sign in"
    Then the admin sees that the sign-in button is busy

  Scenario: At 390px the card comes before the screenshot
    Given the admin screen is 390 by 844
    When the admin opens "/"
    Then the admin sees that the page has no horizontal scroll
    And the admin sees that the sign-in card sits above the site screenshot

  Scenario: An expired token on a page signs out in place
    Given the admin is signed in
    And the admin API answers GET "/work-history" with status 401 and body "{\"success\":false,\"error\":\"Unauthorized\"}"
    When the admin opens "/work-history"
    Then the admin sees that the sign-in screen shows
    And the admin sees that the page did not reload
