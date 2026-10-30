@site @consent
Feature: Opt-in consent for analytics and preferences (PECR / UK GDPR; Consent.dc.html)
  Every scenario starts with empty storage: a first visit.

  Background:
    Given the visitor uses a desktop screen
    And the visitor watches analytics requests

  Scenario: First visit: nothing is tracked and no visit ID exists, on load, after client navigation and after a reload
    When the visitor opens "/"
    Then the consent banner is shown
    And the visitor waits 1500 ms
    And no analytics request was sent
    And no visit ID is stored
    When the visitor clicks "Projects" in the "Main" nav
    Then the URL path is "/projects"
    And the visitor waits 1500 ms
    And no analytics request was sent
    And no visit ID is stored
    When the visitor reloads the page
    Then the consent banner is shown
    And the visitor waits 1500 ms
    And no analytics request was sent
    And no visit ID is stored
    And localStorage "portfolio_consent" is absent

  Scenario: "No thanks": still nothing tracked, and the banner doesn't come back
    When the visitor opens "/"
    And the visitor clicks "No thanks"
    Then the toast says "No problem. Nothing is tracked."
    And the consent banner is not shown
    And the stored consent has analytics "false" and preferences "false"
    When the visitor clicks "Experience" in the "Main" nav
    And the visitor reloads the page
    And the visitor waits 1500 ms
    Then the consent banner is not shown
    And no analytics request was sent
    And no visit ID is stored

  Scenario: "Allow analytics": tracking starts from the next page view
    When the visitor opens "/"
    And the visitor clicks "Allow analytics"
    Then the toast says "Thanks! Analytics is on."
    And the consent banner is not shown
    And the stored consent has analytics "true" and preferences "true"
    And the visitor waits 1500 ms
    And no analytics request was sent
    When the visitor clicks "Projects" in the "Main" nav
    Then an analytics page view for "/projects" is sent
    And a visit ID is stored
    And every analytics request carries the stored visit ID

  Scenario: Withdrawing in Cookie settings removes the visit ID and stops tracking at once
    Given the visitor has already chosen analytics "on" and preferences "on"
    When the visitor opens "/"
    Then an analytics page view for "/" is sent
    And a visit ID is stored
    When the visitor clicks "Cookie settings"
    Then the dialog "Cookie settings" is open
    And the "Analytics" switch is "on"
    When the visitor clicks the "Analytics" switch
    And the visitor clicks "Save my choices"
    Then the toast says "Your choices are saved."
    And no visit ID is stored
    And the stored consent has analytics "false" and preferences "true"
    When the analytics log is cleared
    And the visitor clicks "Projects" in the "Main" nav
    And the visitor clicks "Experience" in the "Main" nav
    And the visitor waits 1500 ms
    Then no analytics request was sent since the log was cleared
    And no visit ID is stored

  Scenario: Reject all in Cookie settings withdraws everything
    Given the visitor has already chosen analytics "on" and preferences "on"
    And the visitor has "home_colourway" set to "Rose" in localStorage
    When the visitor opens "/"
    And the visitor clicks "Cookie settings"
    And the visitor clicks "Reject all"
    Then no visit ID is stored
    And localStorage "home_colourway" is absent
    And the stored consent has analytics "false" and preferences "false"

  Scenario Outline: <signal>: analytics defaults off and the note is shown
    Given the browser sends <signal>
    When the visitor opens "/"
    Then the consent banner shows "Your browser asks sites not to track you, so analytics stays off unless you turn it on yourself."
    When the visitor clicks "Choose what’s allowed"
    Then the "Analytics" switch is "off"
    And the "Preferences" switch is "off"
    And the visitor waits 1000 ms
    And no analytics request was sent
    When the visitor clicks the "Analytics" switch
    And the visitor clicks "Save my choices"
    And the visitor clicks "About" in the "Main" nav
    Then an analytics page view for "/about" is sent

    Examples:
      | signal                  |
      | Global Privacy Control  |
      | Do Not Track            |

  Scenario: Without GPC or DNT there is no note
    When the visitor opens "/"
    Then the consent banner is shown
    And the page does not show "Your browser asks sites not to track you"

  Scenario: Legacy opt-out "1" becomes a refusal and the old key is removed
    Given the visitor has "portfolio_analytics_opt_out" set to "1" in localStorage
    When the visitor opens "/"
    And the visitor waits 1000 ms
    Then the consent banner is not shown
    And localStorage "portfolio_analytics_opt_out" is absent
    And the stored consent has analytics "false" and preferences "false"
    And no analytics request was sent

  Scenario: Legacy key with any other value is removed and the visitor is asked
    Given the visitor has "portfolio_analytics_opt_out" set to "0" in localStorage
    When the visitor opens "/"
    Then the consent banner is shown
    And localStorage "portfolio_analytics_opt_out" is absent
    And localStorage "portfolio_consent" is absent
    And no analytics request was sent

  Scenario: A stored choice from another consent version is ignored, so the visitor is asked again
    Given the visitor has "portfolio_consent" set to "{\"v\":0,\"analytics\":true,\"prefs\":true,\"at\":\"2026-01-01T00:00:00.000Z\"}" in localStorage
    When the visitor opens "/"
    Then the consent banner is shown
    And the visitor waits 1000 ms
    And no analytics request was sent

  Scenario: Preferences off: the colourway works for the visit but isn't remembered
    Given the site flag "show_colourways" is on
    When the visitor opens "/"
    And the visitor clicks "No thanks"
    And the visitor clicks "Rose"
    Then the swatch "Rose" is pressed
    And localStorage "home_colourway" is absent
    When the visitor reloads the page
    Then the swatch "Lilac" is pressed

  Scenario: Preferences on: the colourway is remembered
    Given the site flag "show_colourways" is on
    When the visitor opens "/"
    And the visitor clicks "Allow analytics"
    And the visitor clicks "Rose"
    Then localStorage "home_colourway" is "Rose"
    When the visitor reloads the page
    Then the swatch "Rose" is pressed

  Scenario: No banner on /cv
    When the visitor opens "/cv"
    And the visitor waits 1000 ms
    Then the consent banner is not shown
    And no analytics request was sent

  Scenario: No banner on the maintenance page
    Given maintenance mode is on
    When the visitor opens "/"
    Then the visitor sees the maintenance page
    And the visitor waits 1000 ms
    And the consent banner is not shown
    And no analytics request was sent

  Scenario: Banner by keyboard: the buttons are reachable with Tab and work with Enter
    When the visitor opens "/"
    Then "No thanks" is reachable with Tab within 60 presses
    When the visitor focuses "Allow analytics" and presses Enter
    Then the consent banner is not shown
    And the stored consent has analytics "true" and preferences "true"

  Scenario: Settings by keyboard: opens from the banner, traps focus, Escape returns focus to the opener
    When the visitor opens "/"
    And the visitor focuses "Choose what’s allowed" and presses Enter
    Then the dialog "Cookie settings" is open
    And focus is inside the open dialog
    And focus stays inside the dialog for 12 presses of Tab
    And focus stays inside the dialog for 4 presses of Shift+Tab
    When the visitor presses Escape 1 times
    Then no dialog is open
    And the focused element is "Choose what’s allowed"
    And the consent banner is shown

  Scenario: Settings by keyboard from the footer: switches toggle with Space, focus returns to Cookie settings
    Given the visitor has already chosen analytics "off" and preferences "off"
    When the visitor opens "/"
    And the visitor focuses "Cookie settings" and presses Enter
    Then the dialog "Cookie settings" is open
    When the visitor focuses the "Analytics" switch and presses Space
    Then the "Analytics" switch is "on"
    When the visitor presses Escape 1 times
    Then no dialog is open
    And the focused element is "Cookie settings"
    And the stored consent has analytics "false" and preferences "false"

  Scenario: Essential is always on and can't be switched off
    When the visitor opens "/"
    And the visitor clicks "Choose what’s allowed"
    Then the dialog shows "Always on"
    And there is no enabled "Essential" switch

  Scenario Outline: "No thanks" and "Allow analytics" carry equal weight at <screen>
    Given the visitor uses a <screen> screen
    When the visitor opens "/"
    Then the "No thanks" and "Allow analytics" buttons are the same size

    Examples:
      | screen  |
      | desktop |
      | phone   |

  Scenario: Reject all and Allow all carry equal weight in settings
    When the visitor opens "/"
    And the visitor clicks "Choose what’s allowed"
    Then the "Reject all" and "Allow all" buttons are the same size

  Scenario: The /privacy storage table lists every key the site actually stores
    Given the site flag "show_colourways" is on
    And the visitor has "portfolio_analytics_opt_out" set to "0" in localStorage
    When the visitor opens "/"
    And the visitor records the storage keys
    And the visitor clicks "Allow analytics"
    And the visitor clicks "Rose"
    And the visitor records the storage keys
    And the visitor clicks "Blog" in the "Main" nav
    And the visitor records the storage keys
    And the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor clicks the sparkle button
    And the visitor records the storage keys
    And the visitor opens "/privacy"
    And the visitor records the storage keys
    Then the storage table on /privacy names every recorded key
    And the recorded keys include "portfolio_consent, portfolio_visit_id, home_colourway, post_sparkle:shipping-a-desktop-app"

  Scenario: /privacy shows the current state and opens Cookie settings
    When the visitor opens "/privacy"
    And the visitor clicks "Cookie settings" in the "main" section
    Then the dialog "Cookie settings" is open
