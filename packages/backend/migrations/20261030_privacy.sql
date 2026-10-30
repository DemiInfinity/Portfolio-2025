-- 20261030_privacy.sql
-- D-10: Hire me messages no longer keep an IP address or user agent.
-- Clears the values already stored. Idempotent: only touches rows that still
-- have one, so a second run changes nothing. The columns stay (nullable) so
-- nothing that reads them breaks; the API no longer writes them.
-- Run after 20261027_redesign.sql (which creates contact_messages).

UPDATE contact_messages
SET ip_address = NULL,
    user_agent = NULL
WHERE ip_address IS NOT NULL
   OR user_agent IS NOT NULL;
