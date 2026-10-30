@admin
Feature: Blog (T7)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T09:00:00" for the admin
    And the admin is signed in

  Scenario: Sub line
    When the admin opens "/blog"
    Then the admin sees that the sub line reads "4 published, 0 drafts. Latest: 1 Apr 2026."

  Scenario: Search and the Drafts filter
    When the admin opens "/blog"
    And the admin types "velopack" into "Search posts"
    Then the admin sees that there are 1 visible rows
    When the admin clears "Search posts"
    And the admin clicks the segment "Drafts"
    Then the admin sees "No drafts. Every post is live."

  Scenario: Publishing a new post
    When the admin opens "/blog"
    And the admin clicks the header button "New post"
    And the admin types "Testing the admin: a field guide" into "Title"
    And the admin types "A short excerpt." into "Excerpt"
    And the admin types "Some words in the post." into "Post content in Markdown"
    And the admin types "Testing" into "Category"
    And the admin types "Cypress, QA" into "Tags"
    And the admin flips the switch "Published"
    And the admin clicks "Publish post"
    Then the admin sees that the last POST to "/blog" had the body:
      """
      { "title": "Testing the admin: a field guide", "tags": ["Cypress", "QA"], "published": true }
      """
    And the admin sees that the toast reads "Published “Testing the admin”"

  Scenario: Publishing needs an excerpt, content and category
    When the admin opens "/blog"
    And the admin clicks the header button "New post"
    And the admin types "Only a title" into "Title"
    And the admin flips the switch "Published"
    And the admin clicks "Publish post"
    Then the admin sees that the field "Excerpt" shows the error "Add an excerpt."
    And the admin sees that the field "Category" shows the error "Add a category."
    And the admin sees that the field "Post content in Markdown" shows the error "Write the post before publishing."
    And the admin sees that no POST request was sent to "/blog"

  Scenario: ?new=1 opens the New post dialog
    When the admin opens "/blog?new=1"
    Then the admin sees that a dialog titled "New post" is open
    And the admin sees that the URL search is ""

  Scenario: Delete confirm quotes the post title
    When the admin opens "/blog"
    And the admin clicks "Edit Stop Thinking in Pages. Start Thinking in Components."
    And the admin clicks "Delete post"
    Then the admin sees that the confirm reads "Delete this post?"
    And the admin sees that the confirm text includes "“Stop Thinking in Pages. Start Thinking in Components.” comes off the blog"
    When the admin clicks the confirm button "Delete post"
    Then the admin sees that a DELETE request was sent to "/blog/3"
    And the admin sees that the toast reads "Post deleted"
