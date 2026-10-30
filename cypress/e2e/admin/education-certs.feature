@admin
Feature: Education (T9) and Certifications (T10)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Education sub line and row
    When the admin opens "/education"
    Then the admin sees that the sub line reads "1 entry. Shown on the Experience page and the CV."
    And the admin sees "BSc Computer Science"
    And the admin sees "2016 – 2020"

  Scenario: Education delete confirm
    When the admin opens "/education"
    And the admin clicks "Edit BSc at Teesside University"
    And the admin clicks "Delete entry"
    Then the admin sees that the confirm reads "Delete BSc at Teesside University?"
    When the admin clicks the confirm button "Delete entry"
    Then the admin sees that a DELETE request was sent to "/education/1"
    And the admin sees that the toast reads "Entry deleted"

  Scenario: Certifications empty state and rail
    When the admin opens "/certifications"
    Then the admin sees "No certifications yet"
    And the admin sees "Add one with its credential link and it appears on the About page and in a Certifications section on the CV."
    And the admin sees "The CV leaves out the Certifications section while this list is empty, so there's no blank heading."
    And the admin sees that the sub line reads "None listed yet. They show on the About page and the CV."

  Scenario: Adding a certification
    When the admin opens "/certifications"
    And the admin clicks "Add your first certification"
    And the admin types "AWS Certified Developer" into "Certification name"
    And the admin types "Amazon Web Services" into "Issuer"
    And the admin types "ABC-123" into "Credential ID"
    And the admin types "2026-03-15" into "Issued"
    And the admin clicks "Add certification" in the dialog
    Then the admin sees that the last POST to "/certifications" had the body:
      """
      { "name": "AWS Certified Developer", "issuer": "Amazon Web Services", "issue_date": "2026-03-15", "expiry_date": null, "credential_id": "ABC-123", "skills": [] }
      """
    And the admin sees the last POST to "/certifications" has the keys "name, issuer, issue_date, expiry_date, credential_id, credential_url, description, skills"
    And the admin sees that the toast reads "Saved AWS Certified Developer"
    And the admin sees that there are 1 visible rows
    And the admin sees "Amazon Web Services, 2026 · ID ABC-123"

  Scenario: Certifications delete confirm names the certification
    Given the admin fixture has "certifications" set to "[{\"id\":7,\"name\":\"AWS Certified Developer\",\"issuer\":\"Amazon Web Services\",\"issue_date\":\"2026-03-15\",\"expiry_date\":null,\"credential_id\":\"ABC-123\",\"credential_url\":null,\"description\":null,\"skills\":[]}]"
    When the admin opens "/certifications"
    And the admin clicks "Edit AWS Certified Developer"
    And the admin clicks "Delete"
    Then the admin sees that the confirm reads "Delete AWS Certified Developer?"
    When the admin clicks the confirm button "Delete certification"
    Then the admin sees that a DELETE request was sent to "/certifications/7"
    And the admin sees that the toast reads "Certification deleted"
