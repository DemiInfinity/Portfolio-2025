@site
Feature: Blog list and post (F-16, F-17, H-14)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-16 AC1 filter chips with counts
    When the visitor opens "/blog"
    Then the page heading contains "The blog"
    And the topic filters are "All 4, Desktop 1, Backend 1, Frontend 2"
    And the filter "All 4" is pressed

  Scenario: F-16 AC2 All: featured card is the Desktop post, More posts has 3 cards
    When the visitor opens "/blog"
    Then the featured post is "Shipping a desktop app with Velopack"
    And the featured post shows "Featured" and "Desktop" and "6 min read"
    And "More posts" has 3 post cards

  Scenario: F-16 no featured post: the newest is the big card
    Given no blog post is featured
    When the visitor opens "/blog"
    Then the featured post is "Shipping a desktop app with Velopack"

  Scenario: F-16 AC3 Frontend filter
    When the visitor opens "/blog"
    And the visitor clicks the filter "Frontend 2"
    Then the filter "Frontend 2" is pressed
    And there is no featured post
    And there is a heading "Frontend posts"
    And the page shows 2 post cards

  Scenario: F-16 AC4 cards link to the post and show "d Month yyyy"
    When the visitor opens "/blog"
    Then the post card "Design tokens that scale" links to "/blog/design-tokens-that-scale"
    And the post card "Design tokens that scale" shows "15 November 2025"

  Scenario: F-16 empty blog
    Given the site mock "blog" is:
      """
      []
      """
    When the visitor opens "/blog"
    Then the page heading contains "The blog"
    And the page shows an empty blog message

  Scenario: F-16 asks the API for 100 posts
    When the visitor opens "/blog"
    Then the mock API saw "GET /api/blog" with "?limit=100"

  Scenario: F-17 AC1 post header
    When the visitor opens "/blog/shipping-a-desktop-app"
    Then the page heading is "Shipping a desktop app with Velopack"
    And the visitor sees "6 min read · 7 January 2026"
    And the visitor sees "Demi Taylor Nimmo"

  Scenario: F-17 author falls back to Demi Taylor Nimmo
    When the visitor opens "/blog/postgres-row-level-security"
    Then the visitor sees "Demi Taylor Nimmo"
    And the visitor sees "8 min read · 2 December 2025"

  Scenario: F-17 AC2 no browser request for the post after load
    Given the visitor watches browser requests to the blog API
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor waits 1500 ms
    Then the browser made no request to "/api/blog/shipping-a-desktop-app"

  Scenario: F-17 AC3 Copy link copies the post URL and shows a toast
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor stubs the clipboard
    And the visitor clicks "Copy link"
    Then the clipboard received "SITE/blog/shipping-a-desktop-app"
    And the toast says "Link copied to your clipboard"

  Scenario: F-17 AC4 sparkle survives a reload
    When the visitor opens "/blog/shipping-a-desktop-app"
    And the visitor clicks the sparkle button
    Then the sparkle button is pressed and reads "Sparkle sent"
    When the visitor reloads the page
    Then the sparkle button is pressed and reads "Sparkle sent"

  Scenario: F-17 AC5 keep reading: two others, same category first
    When the visitor opens "/blog/design-tokens-that-scale"
    Then Keep reading links to "/blog/accessible-modals, /blog/shipping-a-desktop-app"

  Scenario: F-17 AC6 Markdown: blockquote and fenced code
    When the visitor opens "/blog/shipping-a-desktop-app"
    Then a blockquote contains "Ship small, ship often."
    And a "pre code" element contains "const answer = 42"

  Scenario: F-17 AC7 metadata
    When the visitor opens "/blog/shipping-a-desktop-app"
    Then the meta "og:title" contains "Shipping a desktop app with Velopack"
    And the meta "og:type" is "article"
    And the meta "twitter:card" is "summary_large_image"
    And the canonical link ends with "/blog/shipping-a-desktop-app"

  Scenario: F-17 Written by Demi links to About
    When the visitor opens "/blog/shipping-a-desktop-app"
    Then the page has a link to "/about"

  Scenario: F-17 AC8 unknown slug shows the not-found page
    When the visitor opens "/blog/does-not-exist"
    Then the visitor sees the not-found page with a link home
