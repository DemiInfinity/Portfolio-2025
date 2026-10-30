@admin
Feature: Messages inbox (AdminInbox, H-24)

  Background:
    Given the admin API serves the content fixture
    And today is "2026-10-27T10:00:00" for the admin
    And the admin is signed in

  Scenario: List, sub line, filter counts and the unread badge
    When the admin opens "/messages"
    Then the admin sees that the h1 reads "Messages"
    And the admin sees that the sub line reads "3 messages from the Hire me form, 2 unread."
    And the admin sees the message list reads "Sam Carter, Alex Rivers, Kim Lee"
    And the admin sees that the segment "All" shows the count "3"
    And the admin sees that the segment "Unread" shows the count "2"
    And the admin sees that the segment "Roles" shows the count "1"
    And the admin sees that the segment "Freelance" shows the count "1"
    And the admin sees that the segment "Hellos" shows the count "1"
    And the admin sees the sidebar Messages badge "2"
    And the admin sees "Choose a message to read it."
    And the admin sees that the document title is "Messages | Admin | Demi Taylor Nimmo"
    And the admin sees that no PATCH request was sent at all

  Scenario: Opening an unread message marks it read
    When the admin opens "/messages"
    And the admin opens the message from "Sam Carter"
    Then the admin sees that the last PATCH to "/contact/3" had the body:
      """
      { "read": true }
      """
    And the admin sees the reader shows "Hi Demi," and "Could we talk this week?" on separate lines
    And the admin sees "A full-time role"
    And the admin sees "Sent from /projects/lunalore"
    And the admin sees "Emailed to you"
    And the admin sees the "Reply by email" link goes to "mailto:sam@agency.example?subject=Re%3A%20your%20message%20on%20demitaylornimmo.com"
    And the admin sees "Messages are deleted automatically 12 months after they arrive (on 27 Oct 2027). Delete it now if the sender asks you to."
    And the admin sees the sidebar Messages badge "1"
    And the admin sees the console never shows "fintech" or "sam@agency.example"

  Scenario: Mark as unread
    When the admin opens "/messages"
    And the admin opens the message from "Kim Lee"
    Then the admin sees that no PATCH request was sent at all
    When the admin clicks "Mark as unread"
    Then the admin sees that the last PATCH to "/contact/1" had the body:
      """
      { "read": false }
      """
    And the admin sees that the toast reads "Marked as unread"
    And the admin sees "Mark as read"

  Scenario: Email delivery labels
    When the admin opens "/messages"
    And the admin opens the message from "Alex Rivers"
    Then the admin sees "Not emailed (email not set up)"
    When the admin opens the message from "Kim Lee"
    Then the admin sees "Email failed"

  Scenario: Delete with a named confirm
    When the admin opens "/messages"
    And the admin opens the message from "Alex Rivers"
    And the admin clicks "Delete"
    Then the admin sees that the confirm reads "Delete the message from Alex Rivers?"
    And the admin sees that the confirm text includes "It's removed permanently, along with their name and email. Do this when someone asks you to delete their data."
    When the admin clicks "Keep it"
    Then the admin sees that no DELETE request was sent to "/contact/2"
    When the admin clicks "Delete"
    And the admin clicks the confirm button "Delete message"
    Then the admin sees that a DELETE request was sent to "/contact/2"
    And the admin sees that the toast reads "Message deleted"
    And the admin sees the message list reads "Sam Carter, Kim Lee"

  Scenario: Search and filters with empty states
    When the admin opens "/messages"
    And the admin types "booking" into "Search messages"
    Then the admin sees the message list reads "Alex Rivers"
    And the admin sees that the segment "All" shows the count "1"
    And the admin sees that the segment "Roles" shows the count "0"
    When the admin clears "Search messages"
    And the admin types "kim@mail" into "Search messages"
    Then the admin sees the message list reads "Kim Lee"
    When the admin clears "Search messages"
    And the admin types "zzz" into "Search messages"
    Then the admin sees "No messages match “zzz”."
    When the admin clears "Search messages"
    And the admin clicks the segment "Unread"
    Then the admin sees the message list reads "Sam Carter, Alex Rivers"
    When the admin clicks the segment "Hellos"
    Then the admin sees the message list reads "Kim Lee"

  Scenario: Nothing in this filter
    Given the admin fixture has every message read
    When the admin opens "/messages"
    And the admin clicks the segment "Unread"
    Then the admin sees "Nothing in this filter."

  Scenario: Empty inbox and the badge hidden at 0
    Given the admin fixture has "messages" set to "[]"
    When the admin opens "/messages"
    Then the admin sees "No messages yet. They’ll appear here when someone uses Hire me."
    And the admin sees that the sub line reads "0 messages from the Hire me form, 0 unread."
    And the admin sees no sidebar Messages badge

  Scenario: Phone layout is one pane with a way back
    Given the admin screen is 390 by 844
    When the admin opens "/messages"
    Then the admin sees that the page has no horizontal scroll
    And the admin sees the message list and not the reader
    When the admin opens the message from "Sam Carter"
    Then the admin sees the reader and not the message list
    And the admin sees that the page has no horizontal scroll
    When the admin clicks "← All messages"
    Then the admin sees the message list and not the reader

  Scenario: Phone sheet shows the badge
    Given the admin screen is 390 by 844
    When the admin opens "/"
    And the admin clicks "Open menu"
    Then the admin sees the sheet link "Messages 2 unread"
