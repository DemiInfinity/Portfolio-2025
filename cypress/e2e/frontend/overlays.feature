@site
Feature: Hire me modal and mobile menu (F-4, F-6, F-7)

  Background:
    Given the visitor uses a desktop screen

  Scenario: F-4 AC1 Escape closes the dialog and focus returns to Hire me
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the dialog "Let’s build something" is open
    And focus is inside the open dialog
    When the visitor presses Escape 1 times
    Then no dialog is open
    And the focused element is "Hire me"

  Scenario: F-4 AC2 backdrop click closes, a click inside does not
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor clicks inside the dialog
    Then the dialog "Let’s build something" is open
    When the visitor clicks the overlay backdrop
    Then no dialog is open

  Scenario: F-4 AC3 Tab and Shift+Tab never leave the open dialog
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then focus stays inside the dialog for 14 presses of Tab
    And focus stays inside the dialog for 4 presses of Shift+Tab

  Scenario: F-4 body scroll is locked while the dialog is open
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the page body does not scroll
    When the visitor presses Escape 1 times
    Then the page body can scroll

  Scenario: F-6 AC1 kind chips
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the chip "A full-time role" is pressed
    When the visitor clicks "Freelance work"
    Then the chip "Freelance work" is pressed
    And the chip "A full-time role" is not pressed

  Scenario: F-6 copy and fields from the design
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the dialog shows "Tell me a little about it. I read every message."
    And the field "Your name" has placeholder "Ada Lovelace"
    And the field "Email" has placeholder "you@company.com"
    And the field "Message" has placeholder "What are you building?"
    And the field "Email" is described by "I only use it to reply."
    And the "Close" button is visible

  Scenario: F-6 AC2 unfinished email: no request, field marked invalid
    Given the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "hello@" into "Email"
    And the visitor clicks "Send message"
    Then the field "Email" has aria-invalid "true"
    And the dialog shows "That email looks unfinished."
    And the hint "That email looks unfinished." is coloured "rgb(194, 24, 91)"
    And no contact request was sent

  Scenario: F-6 valid email gets the green state
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    Then the field "Email" has the ok state

  Scenario: F-6 AC3 success sends exactly the contract body
    Given the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "Ada Lovelace" into "Your name"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the contact request body is exactly:
      """
      { "kind": "role", "name": "Ada Lovelace", "email": "ada@example.com", "message": "Hi", "website": "", "source_path": "/" }
      """
    And the dialog shows "Message sent!"
    And the dialog shows "Thank you, Ada. I’ll reply to your inbox within a couple of days."

  Scenario: F-6 AC3 source_path and kind follow the page and the chip
    Given the contact endpoint answers 201
    When the visitor opens "/about"
    And the visitor clicks "Hire me"
    And the visitor clicks "Just saying hi"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hello" into "Message"
    And the visitor clicks "Send message"
    Then the contact request body has "source_path" "/about"
    And the contact request body has "kind" "hi"

  Scenario: F-6 AC4 blank name thanks a friend
    Given the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the dialog shows "Thank you, friend. I’ll reply to your inbox within a couple of days."
    And the contact request body has "name" ""

  Scenario: F-6 success: Back to the site closes, reopening shows an empty form
    Given the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "Ada Lovelace" into "Your name"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    And the visitor clicks "Back to the site"
    Then no dialog is open
    When the visitor clicks "Hire me"
    Then the field "Your name" is empty
    And the field "Email" is empty
    And the field "Message" is empty
    And the chip "A full-time role" is pressed

  Scenario Outline: F-6 AC5 <status> keeps the form and shows the error toast
    Given the contact endpoint answers <status>
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "Ada Lovelace" into "Your name"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the toast says "Couldn’t send. Check your connection and try again."
    And the dialog "Let’s build something" is open
    And the field "Your name" has value "Ada Lovelace"
    And the field "Email" has value "ada@example.com"
    And the field "Message" has value "Hi"

    Examples:
      | status  |
      | 500     |
      | 429     |
      | network |

  Scenario: F-6 400 with details marks the named field
    Given the contact endpoint answers 400 for field "message"
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "x" into "Message"
    And the visitor clicks "Send message"
    Then the field "Message" has aria-invalid "true"
    And the dialog "Let’s build something" is open

  Scenario: F-6 AC6 pending request: Sending and disabled
    Given the contact endpoint answers 201 after 3000 ms
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the submit button reads "Sending" and is disabled
    And the dialog shows "Message sent!"

  Scenario: F-6 AC7 Prefer email link
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the dialog has a link "demi.21@outlook.com" to "mailto:demi.21@outlook.com"
    And the dialog shows "Prefer email?"

  Scenario: F-6 honeypot is hidden from people and keyboards, sent empty
    Given the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    Then the honeypot field "website" is hidden and out of the tab order
    When the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the contact request body has "website" ""

  Scenario: F-6 honeypot filled by a bot still shows the sent state (200 { success: true })
    Given the contact endpoint answers 200
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And a bot fills the honeypot field "website" with "http://spam.example"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    And the visitor clicks "Send message"
    Then the contact request body has "website" "http://spam.example"
    And the dialog shows "Message sent!"

  Scenario: F-7 AC1 phone menu lists the five links
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    Then the "Mobile" nav links are "Home, Projects, Experience, About, Blog"
    And focus is inside the "Mobile" nav

  Scenario: F-7 AC2 tapping Projects navigates and closes the drawer
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    And the visitor clicks "Projects" in the "Mobile" nav
    Then the URL path is "/projects"
    And there is no "Mobile" nav

  Scenario: F-7 AC3 Hire me in the drawer hands over to the contact dialog
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    And the visitor clicks "Hire me" in the "Mobile" nav
    Then there is no "Mobile" nav
    And the dialog "Let’s build something" is open
    And focus is inside the open dialog

  Scenario: F-7 AC4 current page in the drawer
    Given the visitor uses a phone screen
    When the visitor opens "/blog"
    And the visitor clicks "Open menu"
    Then in the "Mobile" nav only "Blog" has aria-current "page"

  Scenario: F-7 AC5 Escape closes the drawer and focus returns to Open menu
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    And the visitor presses Escape 1 times
    Then there is no "Mobile" nav
    And the focused element is "Open menu"

  Scenario: F-7 backdrop closes the drawer, Tab stays inside, Close menu works
    Given the visitor uses a phone screen
    When the visitor opens "/"
    And the visitor clicks "Open menu"
    Then focus stays inside the "Mobile" nav for 10 presses of Tab
    When the visitor clicks the overlay backdrop
    Then there is no "Mobile" nav
    When the visitor clicks "Open menu"
    And the visitor clicks "Close menu"
    Then there is no "Mobile" nav

  Scenario: F-6 at 390px the whole form can be reached and sent
    Given the visitor uses a phone screen
    And the contact endpoint answers 201
    When the visitor opens "/"
    And the visitor clicks "Hire me"
    And the visitor types "ada@example.com" into "Email"
    And the visitor types "Hi" into "Message"
    Then the "Send message" button can be scrolled into view inside the dialog
    When the visitor clicks "Send message"
    Then the dialog shows "Message sent!"
