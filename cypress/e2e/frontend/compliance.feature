@site @consent
Feature: Compliance: media through our own domain, analytics v2 (H-23), /privacy sections, Hire me privacy line

  Background:
    Given the visitor uses a desktop screen
    And the visitor watches analytics requests

  Scenario Outline: Before consent, <path> makes no request to supabase.co and images come through /media
    Given the visitor records requests to supabase.co
    When the visitor opens "<path>"
    And the visitor scrolls through the page
    Then no request went to supabase.co
    And every image source is on the site's own origin or the API
    And no cookie is set

    Examples:
      | path                         |
      | /                            |
      | /projects                    |
      | /projects/lunalore           |
      | /blog                        |
      | /blog/shipping-a-desktop-app |
      | /about                       |
      | /experience                  |
      | /learning                    |
      | /privacy                     |

  Scenario: Supabase images are rewritten to /media
    When the visitor opens "/projects/lunalore"
    Then an image source starts with "/media/qarefabcdef123456/portfolio-media/projects/"

  Scenario: The generated CV link is same-origin
    Given the site resume is available at "https://qarefabcdef123456.supabase.co/storage/v1/object/public/portfolio-media/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1"
    And the visitor has already chosen analytics "off" and preferences "off"
    When the visitor opens "/"
    Then the "Download CV" link is same-origin under "/media/"

  Scenario: Accepting tracks the landing page once, then one page_view per navigation (no doubles)
    When the visitor opens "/projects"
    And the visitor clicks "Allow analytics"
    And the visitor waits 1500 ms
    And the visitor clicks "Experience" in the "Main" nav
    And the visitor waits 1500 ms
    And the visitor clicks "About" in the "Main" nav
    And the visitor waits 1500 ms
    Then the page_view events are for "/projects, /experience, /about" with distinct view IDs
    And every view_update refers to an earlier page_view and is not a page_view
    And every analytics request carries the stored visit ID

  Scenario: A reload is one new page_view, not two
    Given the visitor has already chosen analytics "on" and preferences "off"
    When the visitor opens "/experience"
    And the visitor waits 1500 ms
    And the visitor reloads the page
    And the visitor waits 1500 ms
    Then the page_view events are for "/experience, /experience" with distinct view IDs

  Scenario: Referrer and UTM tags go only on the visit's first page_view
    Given the visitor has already chosen analytics "on" and preferences "off"
    When the visitor opens "/?utm_source=LinkedIn&utm_medium=social&utm_campaign=launch"
    And the visitor waits 1500 ms
    And the visitor clicks "Projects" in the "Main" nav
    And the visitor waits 1500 ms
    Then the first page_view has utm_source "linkedin"
    And the later page_views carry no utm_source and no referrer

  Scenario: exclude_me=1 never tracks and removes the parameter
    Given the visitor has already chosen analytics "on" and preferences "off"
    When the visitor opens "/?exclude_me=1"
    Then the URL has no query string
    And localStorage "portfolio_exclude_me" is set
    When the visitor clicks "Projects" in the "Main" nav
    And the visitor reloads the page
    And the visitor waits 1500 ms
    Then no analytics request was sent
    When the visitor opens "/?exclude_me=0"
    Then the URL has no query string
    And localStorage "portfolio_exclude_me" is absent
    And an analytics page view for "/" is sent

  Scenario: /privacy has the lawful basis, rights, complaints and ICO sections
    Given the visitor has already chosen analytics "off" and preferences "off"
    When the visitor opens "/privacy"
    Then there is a heading "Why I’m allowed to use it (lawful basis)"
    And there is a heading "Your rights"
    And there is a heading "Complaints"
    And the visitor sees "Article 6(1)(a)"
    And the visitor sees "Article 6(1)(f)"
    And the page text includes each of "(access), (rectification), (erasure), (restriction), (portability)"
    And the visitor sees "You also have the right to object"
    And the visitor sees "Withdrawing doesn’t affect anything done before you withdrew it."
    And the visitor sees "I’ll acknowledge your complaint within 30 days"
    And the page has a link containing "ico.org.uk/make-a-complaint" to "https://ico.org.uk/make-a-complaint/"
    And the visitor sees "0303 123 1113"
    And the visitor sees "Wycliffe House"
    And the page text includes each of "Page-visit records are kept for 12 months, deleted 12 months after I receive them"

  Scenario: Hire me shows the privacy line with a link to /privacy
    Given the visitor has already chosen analytics "off" and preferences "off"
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the dialog shows "I keep your message for 12 months so I can reply."
    And the dialog has a link containing "Privacy" to "/privacy"
