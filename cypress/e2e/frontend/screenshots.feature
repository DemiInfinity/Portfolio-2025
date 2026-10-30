@site @screenshots
Feature: Screenshots for the [MANUAL] criteria (F-1 AC4, F-3 AC5, F-11 AC8, F-18 AC3, F-19 AC9)
  Captures full-page screenshots at 1440 and 390 for comparison with the design files.

  Scenario Outline: capture <name> at <screen>
    Given the visitor uses a <screen> screen
    And the visitor prefers reduced motion
    When the visitor opens "<path>"
    And the visitor waits 800 ms
    Then a full-page screenshot "<screen>-<name>" is saved

    Examples:
      | screen  | name       | path                         |
      | desktop | home       | /                            |
      | desktop | projects   | /projects                    |
      | desktop | case-study | /projects/lunalore           |
      | desktop | experience | /experience                  |
      | desktop | about      | /about                       |
      | desktop | blog       | /blog                        |
      | desktop | post       | /blog/shipping-a-desktop-app |
      | desktop | learning   | /learning                    |
      | desktop | cv         | /cv                          |
      | desktop | privacy    | /privacy                     |
      | phone   | home       | /                            |
      | phone   | projects   | /projects                    |
      | phone   | case-study | /projects/lunalore           |
      | phone   | experience | /experience                  |
      | phone   | about      | /about                       |
      | phone   | blog       | /blog                        |
      | phone   | post       | /blog/shipping-a-desktop-app |
      | phone   | learning   | /learning                    |

  Scenario Outline: capture the overlays at <screen>
    Given the visitor uses a <screen> screen
    And the visitor prefers reduced motion
    When the visitor opens "/"
    And the visitor clicks "<opener>"
    And the visitor waits 600 ms
    Then a viewport screenshot "<screen>-<name>" is saved

    Examples:
      | screen  | name         | opener    |
      | desktop | contact      | Hire me   |
      | phone   | contact      | Hire me   |
      | phone   | mobile-menu  | Open menu |

  Scenario: capture /cv in print media
    Given the visitor uses a desktop screen
    And the page uses print media
    When the visitor opens "/cv"
    And the visitor waits 800 ms
    Then a full-page screenshot "print-cv" is saved

  Scenario: capture Home with motion on (scroll-driven reveals mid-scroll)
    Given the visitor uses a desktop screen
    When the visitor opens "/"
    And the visitor scrolls to 900 pixels
    And the visitor waits 1200 ms
    Then a viewport screenshot "motion-home-900" is saved
