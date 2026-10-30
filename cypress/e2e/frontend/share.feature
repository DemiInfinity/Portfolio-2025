@site
Feature: Share menu (ShareMenu.dc.html) on posts and case studies

  Background:
    Given the visitor uses a desktop screen

  Scenario: Post share menu: items and links
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor removes navigator.share
    And the visitor opens the share menu "Share this post"
    Then the share menu items are "LinkedIn, Email, Copy link"
    And the share item "LinkedIn" links to the LinkedIn share URL for "SITE/blog/shipping-a-desktop-app"
    And the share item "LinkedIn" opens in a new tab safely
    And the share item "Email" is a mailto with subject "Shipping a desktop app with Velopack" and body "SITE/blog/shipping-a-desktop-app"

  Scenario: More options appears only when the browser has a share sheet
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor stubs navigator.share
    And the visitor opens the share menu "Share this post"
    Then the share menu items are "LinkedIn, Email, Copy link, More options"

  Scenario: Copy link falls back when the Clipboard API is blocked, else shows an error toast
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the clipboard API rejects
    And the visitor opens the share menu "Share this post"
    And the visitor chooses "Copy link" in the share menu
    Then a toast is shown

  Scenario: Case study share menu: email subject and URL
    When the visitor opens "/projects/lunalore"
    And the visitor removes navigator.share
    And the visitor opens the share menu "Share this case study"
    Then the share item "Email" is a mailto with subject "LunaLore, a case study" and body "SITE/projects/lunalore"
    And the share item "LinkedIn" links to the LinkedIn share URL for "SITE/projects/lunalore"

  Scenario: Keyboard: Enter opens, arrows, Home and End move, Escape closes and returns focus
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor removes navigator.share
    And the visitor focuses the first Share button and presses "Enter"
    Then the share menu is open and "LinkedIn" has focus
    When the visitor presses the key "ArrowDown"
    Then the share item "Email" has focus
    When the visitor presses the key "End"
    Then the share item "Copy link" has focus
    When the visitor presses the key "ArrowDown"
    Then the share item "LinkedIn" has focus
    When the visitor presses the key "ArrowUp"
    Then the share item "Copy link" has focus
    When the visitor presses the key "Home"
    Then the share item "LinkedIn" has focus
    When the visitor presses the key "Escape"
    Then the share menu is closed
    And the first Share button has focus with aria-expanded "false"

  Scenario Outline: Keyboard: <key> on the button opens the menu
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor focuses the first Share button and presses "<key>"
    Then the share menu is open and "LinkedIn" has focus

    Examples:
      | key       |
      | Space     |
      | ArrowDown |

  Scenario: Tab and outside clicks close the menu
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor opens the share menu "Share this post"
    And the visitor presses the key "Tab"
    Then the share menu is closed
    When the visitor opens the share menu "Share this post"
    And the visitor clicks the page heading
    Then the share menu is closed

  Scenario: The menu stays on screen at 390px
    Given the visitor uses a phone screen
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor opens the share menu "Share this post"
    Then the open share menu is inside the viewport with at least 15px margin

  Scenario Outline: The open menu is on top of the page, so every item can be clicked or tapped (<screen>, post header)
    Given the visitor uses a <screen> screen
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor stubs navigator.share
    And the visitor opens the share menu "Share this post"
    Then every share menu item is the top element at its centre

    Examples:
      | screen  |
      | desktop |
      | phone   |

  Scenario: The open menu is on top of the page on a case study
    When the visitor opens "/projects/lunalore"
    And the visitor stubs navigator.share
    And the visitor opens the share menu "Share this case study"
    Then every share menu item is the top element at its centre
