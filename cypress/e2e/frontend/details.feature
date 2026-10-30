@site
Feature: Design details from the plan's Work notes (F-3 to F-19)
  These check exact values the plan states outside the numbered AC lists.

  Scenario: F-3 header Hire me is the small button (44px) and the icon button is 44x44
    Given the visitor uses a phone screen
    When the visitor opens "/"
    Then the "Hire me" button is 44px tall
    And the "Open menu" button is 44 by 44 px

  Scenario: F-3 default button is 52px tall
    Given the visitor uses a desktop screen
    When the visitor opens "/"
    Then the "View my work" button is 52px tall

  Scenario: F-4 modal panel: max 560px wide, 32px radius
    Given the visitor uses a desktop screen
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the open dialog is at most 560px wide with a 32px radius

  Scenario: F-7 drawer is min(380px, 92vw) wide at 390px, from the right
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    And the visitor waits 700 ms
    Then the "Mobile" nav is 358.8px wide against the right edge

  Scenario: F-3 toast disappears after 2600ms
    Given the contact endpoint answers 500
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the toast says "Couldn’t send. Check your connection and try again."
    When the visitor waits 3000 ms
    Then there is no toast

  Scenario: F-5 case study header is dark over the hero and light after it
    Given the visitor uses a desktop screen
    When the visitor opens "/projects/lunalore"
    Then the sticky header background is "rgba(22, 15, 58, 0.94)"
    When the visitor scrolls to 2500 pixels
    Then the sticky header background is "rgba(252, 250, 255, 0.94)"

  Scenario: F-5 reading progress bar is hidden under reduced motion
    Given the visitor prefers reduced motion
    When the visitor opens "/blog/shipping-a-desktop-app"
    Then the reading progress bar is not shown

  @loader
  Scenario: F-9 slow API shows the loader during navigation
    Given the visitor uses a desktop screen
    And the site mock answers "GET /api/learning" slowly after 4000 ms
    When the visitor opens "/"
    And the visitor waits until the route "/learning" has been prefetched
    And the visitor clicks "Learning" in the "Footer" nav
    Then a status region says "Waking the server…"
    And the visitor sees "It naps when nobody’s around. Give it a few seconds."
    And the page heading eventually is "My learning journey"

  Scenario: F-9 route error frame has Try again and Back to home
    Given the site mock answers "GET /api/work-history" with status 500
    When the visitor opens "/experience"
    Then the "Try again" button is visible
    And the page has a link containing "Back to home" to "/"

  Scenario: F-10 maintenance on: privacy and terms stay readable
    Given maintenance mode is on
    When the visitor opens "/privacy"
    Then the page heading is "Privacy Policy"
    When the visitor opens "/terms"
    Then the page heading is "Terms of Use"

  Scenario: F-11 callouts hidden on phones, chips shown instead
    Given the visitor uses a phone screen
    When the visitor opens "/"
    Then no hero callout is shown
    And the hero chips are shown

  Scenario: F-13 TOC hidden on phones
    Given the visitor uses a phone screen
    When the visitor opens "/projects/lunalore"
    Then the "On this page" nav is not shown

  Scenario: F-15 learning modal: summary line and skills mastered (advanced and expert only)
    When the visitor opens "/about"
    And the visitor clicks "See all courses"
    Then the dialog shows "4 courses in progress · 2 skills mastered"
    And the dialog shows "React, expert: Daily driver"
    And the dialog shows "Node.js, advanced: APIs and tooling"
    And the dialog does not show "Rust, beginner"
    And focus stays inside the dialog for 8 presses of Tab

  Scenario: F-16 no search box on the blog
    When the visitor opens "/blog"
    Then there is no search box

  Scenario: F-17 Share (menu): Copy link copies the post URL and shows the toast
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor stubs the clipboard
    And the visitor opens the share menu "Share this post"
    And the visitor chooses "Copy link" in the share menu
    Then the clipboard received "SITE/blog/shipping-a-desktop-app"
    And the toast says "Link copied"

  Scenario: F-17 Share (menu): More options uses navigator.share when present
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor stubs navigator.share
    And the visitor opens the share menu "Share this post"
    And the visitor chooses "More options" in the share menu
    Then navigator.share was called with the post URL "SITE/blog/shipping-a-desktop-app"

  Scenario: F-19 contact strip, learning line and recommendation caption
    When the visitor opens "/cv"
    Then the visitor sees "LinkedIn: Contact me on LinkedIn"
    And the visitor sees "Email: demi.21@outlook.com"
    And the visitor sees "Portfolio: demitaylornimmo.com"
    And the visitor sees "GitHub: DemiInfinity"
    And the visitor sees "Location: Newcastle upon Tyne"
    And the visitor sees "Advanced TypeScript (Udemy)"
    And the visitor sees "Adam Mellor, Engineering Manager at Cintra"
    And the CV skills list "Frontend" as "React"
    And the CV skills list "Backend" as "Node.js, Rust"

  Scenario: F-19 empty contact items are dropped
    Given the CV mock contact location is empty
    When the visitor opens "/cv"
    Then the page does not show "Location:"

  Scenario: F-19 page break before Skills and A4 sheets on screen
    When the visitor opens "/cv"
    Then there are 2 CV sheets of 794 by 1123 px
    And the "Skills" heading is on the second sheet
