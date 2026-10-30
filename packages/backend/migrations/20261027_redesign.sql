-- 20261027_redesign.sql
-- Round 1 of the redesign. Idempotent: safe to run more than once.
-- Run in the Supabase SQL editor BEFORE deploying the new API, then run
-- 20261028_owner_decisions.sql. The API keeps working without it (new fields
-- are omitted or defaulted), but the new fields won't save until it has run.

-- Learning (H-2): provider, description (= course goal) optional, allow not_started
ALTER TABLE learning ADD COLUMN IF NOT EXISTS provider VARCHAR(120);
ALTER TABLE learning ALTER COLUMN description DROP NOT NULL;
ALTER TABLE learning DROP CONSTRAINT IF EXISTS learning_status_check;
ALTER TABLE learning ADD CONSTRAINT learning_status_check
  CHECK (status IN ('not_started','in_progress','completed','paused'));

-- Work history impact pills (H-11)
ALTER TABLE work_history ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Project case-study header fields (H-13)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS role VARCHAR(120);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS platform VARCHAR(120);

-- Hire me messages (H-10)
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('role','freelance','hi')),
  name VARCHAR(120) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  source_path VARCHAR(300),
  ip_address VARCHAR(64),
  user_agent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No policies: only the service role (the API) can read or write.
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC);

-- Analytics (H-1): page titles, and indexes for the 30-day summary
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS page_title VARCHAR(500);
CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON analytics (created_at);
CREATE INDEX IF NOT EXISTS analytics_session_path_idx ON analytics (session_id, page_path);

-- Built-in feature flags (H-8). Existing rows keep their values.
INSERT INTO feature_flags (name, description, enabled) VALUES
 ('maintenance_mode', 'Shows every visitor the maintenance page instead of the site.', false),
 ('open_to_work', 'The Open to work badge beside your name on the home page.', false),
 ('show_marbl', 'Includes Marbl in the apps the Privacy and Terms pages cover.', false)
ON CONFLICT (name) DO NOTHING;
