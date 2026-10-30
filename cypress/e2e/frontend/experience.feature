@site
Feature: Experience (F-14, H-11)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-14 AC1 four roles, newest first
    When the visitor opens "/experience"
    Then the page heading contains "My experience"
    And the roles are "Software Engineer, Freelance Developer, Software Developer, Student Developer"

  Scenario: F-14 AC2 only the open-ended role is Current, dated "– now"
    When the visitor opens "/experience"
    Then only the role "Software Engineer" shows "Current"
    And the role "Software Engineer" shows "Aug 2025 – now"
    And the role "Freelance Developer" shows "Jun – Aug 2024"
    And the role "Software Developer" shows "Jul 2022 – Jun 2024"

  Scenario: F-14 AC3 highlight pills; none when empty, achievements as list items
    When the visitor opens "/experience"
    Then the role "Software Engineer" shows "−80% manual update effort"
    And the role "Software Developer" lists the achievement "Cut lookup time on calls by 60%."
    And the role "Software Developer" has no highlight pills

  Scenario: F-14 role without the highlights key (pre-migration) still renders
    When the visitor opens "/experience"
    Then the role "Freelance Developer" lists the achievement "Delivered two client sites."

  Scenario: F-14 company links to company_url
    When the visitor opens "/experience"
    Then the page has a link containing "Cintra" to "https://cintra.example.com"

  Scenario: F-14 AC4 education band
    When the visitor opens "/experience"
    Then the visitor sees "BSc Computer Science"
    And the visitor sees "Teesside University, 2016 – 2020"
    And the visitor sees "First Class Honours"

  Scenario: F-14 AC5 Get in touch opens contact
    When the visitor opens "/experience"
    And the visitor clicks "Get in touch"
    Then the dialog "Let’s build something" is open
