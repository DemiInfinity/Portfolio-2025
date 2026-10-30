@admin
Feature: Admin shell (T1, T3, T15, T17; Messages link from the AdminNav update)
  The sidebar, top bar, phone menu and page titles from AdminNav and AdminTop.

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: T1 root class, page background and font
    When the admin opens "/"
    Then the admin sees that the app root has the class "ad"
    And the admin sees that the body background is "rgb(251, 248, 254)" and the font starts with "Poppins"

  Scenario: T1 no emoji on any page
    When the admin opens "/"
    Then no page in the admin shows an emoji

  Scenario: T3/T17 sidebar links, groups and order at 1280px
    Given the admin screen is 1280 by 800
    When the admin opens "/blog"
    Then the admin sees that the sidebar links read "Dashboard, Messages 2 unread, About, Projects, Blog, Work history, Education, Certifications, Learning, Analytics, Feature flags, Settings"
    And the admin sees that the sidebar groups read "Content, Site"
    And the admin sees that only the sidebar link "Blog" is the current page

  Scenario: T17 About is the current page on /about
    When the admin opens "/about"
    Then the admin sees that only the sidebar link "About" is the current page

  Scenario: T3 sign out
    When the admin opens "/"
    And the admin clicks "Sign out"
    Then the admin sees that a POST request was sent to "/auth/logout"
    And the admin sees that the sign-in screen shows

  Scenario: T3 top bar reads Live while maintenance is off
    When the admin opens "/"
    Then the admin sees that the top bar status reads "Live"

  Scenario: T3 top bar reads Maintenance page showing while maintenance is on
    Given the admin fixture has "flags[0].enabled" set to "true"
    When the admin opens "/"
    Then the admin sees that the top bar status reads "Maintenance page showing"

  Scenario: T3 phone menu at 390px
    Given the admin screen is 390 by 844
    When the admin opens "/"
    Then the admin sees that the page has no horizontal scroll
    And the admin sees that the sidebar is not visible
    When the admin clicks "Open menu"
    Then the admin sees that the "Admin menu" sheet shows 12 links
    And the admin sees that the "Open menu" button is expanded
    When the admin clicks the sheet link "Education"
    Then the admin sees that the URL path is "/education"
    And the admin sees that the "Admin menu" sheet is closed
    When the admin clicks "Open menu"
    And the admin presses Escape
    Then the admin sees that the "Admin menu" sheet is closed

  Scenario: T3 top search writes ?q= and filters Projects
    When the admin opens "/projects"
    And the admin types "luna" into the top search
    Then the admin sees that the URL search is "?q=luna"
    And the admin sees that there are 1 visible rows

  Scenario: T15 document title and ?edit deep link
    When the admin opens "/feature-flags"
    Then the admin sees that the document title is "Feature flags | Admin | Demi Taylor Nimmo"
    When the admin opens "/projects?edit=1"
    Then the admin sees that a dialog titled "Edit LunaLore" is open

  Scenario: NB-1 fast typing in both searches keeps every character
    When the admin opens "/projects"
    And the admin types "luna" into the top search at 0 ms a key
    Then the admin sees that the URL search is "?q=luna"
    When the admin types "sqlite" into the "Search projects" box at 0 ms a key
    Then the admin sees that the URL search is "?q=sqlite"
    And the admin sees that there are 1 visible rows

  Scenario: NB-6 tab and segment counts have a spaced accessible name
    When the admin opens "/learning"
    Then the admin sees a control named "Courses 4"
    And the admin sees a control named "Skills 2"
    When the admin opens "/about"
    Then the admin sees a control named "Recommendations 1"
    When the admin opens "/projects"
    Then the admin sees a control named "All 3"
