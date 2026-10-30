@admin
Feature: Analytics v2 notice and campaigns (H-23), exclude-me, Colour switcher, noindex

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Counting-changed notice, measured views caption and Campaigns
    When the admin opens "/analytics"
    Then the admin sees "Counting changed on 31 Oct 2026: earlier figures over-counted visits and under-counted time."
    And the admin sees "Based on 980 views with a measured time"
    And the admin sees the Campaigns card reads "launch, No campaign name"
    And the admin sees "linkedin · social"
    And the admin sees "newsletter · email"

  Scenario: No notice when the range starts on or after the change, and no Campaigns card when empty
    Given the admin fixture has "analytics.trackingVersionSince" set to "\"2026-09-01\""
    And the admin fixture has "analytics.campaigns" set to "[]"
    When the admin opens "/analytics"
    Then the admin sees that the h1 reads "Analytics"
    And the admin sees no text "Counting changed" on the page
    And the admin sees no Campaigns card

  Scenario: Older API without the v2 fields
    Given the admin fixture has "analytics.campaigns" set to "null"
    And the admin fixture has "analytics.measuredViews" set to "null"
    And the admin fixture has "analytics.trackingVersionSince" set to "null"
    When the admin opens "/analytics"
    Then the admin sees "Weighted by views"
    And the admin sees no Campaigns card

  Scenario: Don't count my own visits
    When the admin opens "/settings"
    Then the admin sees "Don't count my own visits"
    And the admin sees the "Open the site and stop counting this browser" link opens "https://www.demitaylornimmo.com/?exclude_me=1" in a new tab

  Scenario: Colour switcher flag label and built-in flags without Delete
    Given the admin fixture has "flags[3]" set to "{\"id\":4,\"name\":\"show_colourways\",\"description\":\"\",\"enabled\":false}"
    When the admin opens "/feature-flags"
    Then the admin sees "Colour switcher"
    And the admin sees the flag "Colour switcher" has a description
    And the admin sees that the sub line reads "4 flags, 1 on. Each switches part of the live site."
    And the admin sees no Delete for the flags "maintenance_mode, open_to_work, show_marbl"

  Scenario: Noindex: robots.txt, meta robots and the vercel.json header
    When the admin opens "/"
    Then the admin sees the meta robots is "noindex, nofollow, noarchive, nosnippet, noimageindex"
    And the admin sees robots.txt is text that allows Googlebot and Bingbot and disallows everyone else
    And the admin sees vercel.json sends X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai" on every path and serves robots.txt as a file
