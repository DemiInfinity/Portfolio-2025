@site
Feature: Site chrome: tokens, header, footer, layout wiring and SEO pass (F-1, F-5, F-8, F-10, F-21)

  Scenario: F-1 AC1 fonts come from next/font, never from fonts.googleapis.com
    Given the visitor records font stylesheet requests
    When the visitor opens "/"
    Then the hero serif heading uses the self-hosted Playfair family
    And the body uses the self-hosted Poppins family
    And no request went to "fonts.googleapis.com/css2"

  Scenario: F-1 AC2 reduced motion turns entrance animations off
    Given the visitor prefers reduced motion
    When the visitor opens "/"
    Then every ".in" element has animation-name "none"

  Scenario: F-1 AC3 keyboard focus ring on the first header link
    When the visitor opens "/experience"
    And the visitor presses Tab 2 times
    Then the focused element is "Demi Taylor Nimmo, home"
    And the focused element has a solid 3px outline

  Scenario: F-5 AC1 main nav order and active page at 1440px
    Given the visitor uses a desktop screen
    When the visitor opens "/experience"
    Then the "Main" nav links are "Home, Projects, Experience, About, Blog"
    And in the "Main" nav only "Experience" has aria-current "page"

  Scenario: F-5 AC2 Projects is current on a case study
    When the visitor opens "/projects/lunalore"
    Then in the "Main" nav only "Projects" has aria-current "page"

  Scenario: F-5 AC3 phone header: links hidden, menu and Hire me shown
    Given the visitor uses a phone screen
    When the visitor opens "/"
    Then the "Main" nav text links are hidden
    And the "Open menu" button is visible
    And the "Hire me" button is visible

  Scenario: F-5 AC4 Hire me opens the contact dialog
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the dialog "Let’s build something" is open

  Scenario: F-5 AC5 case study header stays at the top after scrolling 1500px
    Given the visitor uses a desktop screen
    When the visitor opens "/projects/lunalore"
    And the visitor scrolls to 1500 pixels
    Then the site header is pinned to the top of the viewport

  Scenario: F-8 AC1 footer links on the home page
    When the visitor opens "/"
    Then the footer links to "/projects, /experience, /about, /learning, /blog, /privacy, /terms"
    And the footer links to "https://github.com/DemiInfinity, https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40"

  Scenario: F-8 AC2 footer omits the current page
    When the visitor opens "/about"
    Then the footer has no link to "/about"

  Scenario: F-10 AC1 skip link is the first Tab stop and moves focus to main
    When the visitor opens "/"
    And the visitor presses Tab 1 times
    Then the focused element is "Skip to content"
    When the visitor presses Enter 1 times
    Then the focused element is the main landmark

  Scenario: F-10 AC2 /cv renders bare
    When the visitor opens "/cv"
    Then there is no "Main" nav
    And there is no site footer

  Scenario Outline: F-10 AC3 no sideways scroll at 390px on <path>
    Given the visitor uses a phone screen
    When the visitor opens "<path>"
    Then the page has no sideways scroll

    Examples:
      | path                          |
      | /                             |
      | /projects                     |
      | /projects/lunalore            |
      | /experience                   |
      | /about                        |
      | /blog                         |
      | /blog/shipping-a-desktop-app  |
      | /learning                     |
      | /privacy                      |
      | /terms                        |

  Scenario Outline: F-21 AC1 and AC2 one h1 and no emoji on <path>
    When the visitor opens "<path>"
    Then the page has exactly one h1
    And the page text has no emoji

    Examples:
      | path                          |
      | /                             |
      | /projects                     |
      | /projects/lunalore            |
      | /experience                   |
      | /about                        |
      | /blog                         |
      | /blog/shipping-a-desktop-app  |
      | /learning                     |
      | /privacy                      |
      | /terms                        |

  Scenario: F-21 AC3 sitemap lists the static routes, public projects and posts, and never /cv
    Then the sitemap lists "/, /projects, /experience, /about, /blog, /learning, /privacy, /terms"
    And the sitemap lists "/projects/lunalore, /projects/marbl, /projects/sparky-venture, /projects/rebel-verify"
    And the sitemap lists "/blog/shipping-a-desktop-app, /blog/postgres-row-level-security, /blog/design-tokens-that-scale, /blog/accessible-modals"
    And the sitemap does not list "/cv, /projects/secret-idea, /projects/hidden-thing"

  Scenario: F-15 AC13 sitemap contains /about
    Then the sitemap lists "/about"

  Scenario: F-9 AC3 unknown project shows the not-found page
    When the visitor opens "/projects/does-not-exist"
    Then the visitor sees the not-found page with a link home

  Scenario Outline: F-9, F-12 AC6, F-17 AC8 missing or hidden <path> answers HTTP 404
    Then a request to "<path>" answers status 404

    Examples:
      | path                     |
      | /projects/secret-idea    |
      | /projects/hidden-thing   |
      | /projects/does-not-exist |
      | /blog/does-not-exist     |

  Scenario: F-13 AC10 /projects/12 is a server-side redirect
    Then a request to "/projects/12" redirects with a 3xx to "/projects/lunalore"
