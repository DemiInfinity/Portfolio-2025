@admin
Feature: Analytics (T14) against the summary fixture

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: KPIs
    When the admin opens "/analytics"
    Then the admin sees the analytics KPIs read "688", "1,162", "1 m 33 s" and "186 views"
    And the admin sees "23 a day on average"
    And the admin sees "1.69 pages per visit"
    And the admin sees no text "Sample figures" on the page
    And the admin sees the last GET to "/analytics/summary" had the query "days=30"

  Scenario: The chart
    When the admin opens "/analytics"
    Then the admin sees there are 30 bar buttons
    And the admin sees the bar "13 Oct, 61 visits" has the class "peak"
    When the admin focuses the bar "13 Oct, 61 visits"
    Then the admin sees "13 Oct: 61 visits"

  Scenario: Referrers add up to the visits
    When the admin opens "/analytics"
    Then the admin sees "688 visits in total, the same as the chart."
    And the admin sees the referrer list reads "Direct, linkedin.com, google.com, github.com, Other"

  Scenario: Pages card groups the rest
    When the admin opens "/analytics"
    Then the admin sees "Other pages"
    And the admin sees "12 pages"
    And the admin sees "18 pages"
    And the admin sees "1,162 views in total"

  Scenario: Refresh
    Given the admin API delays GET "/analytics/summary" by 1500 ms
    When the admin opens "/analytics"
    And the admin waits 1700 ms
    And the admin clicks "Refresh"
    Then the admin sees that the "Refreshing" control is disabled
    And the admin sees that 2 GET requests were sent to "/analytics/summary"

  Scenario: Server error
    Given the admin API answers GET "/analytics/summary" with status 500 and body "{\"success\":false,\"error\":\"boom\"}"
    When the admin opens "/analytics"
    Then the admin sees "Couldn't load analytics."
    And the admin sees "Try again"
