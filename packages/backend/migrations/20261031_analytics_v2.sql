-- 20261031_analytics_v2.sql
-- Analytics tracking v2 (H-23, analytics-audit.md). Idempotent; adds only.
-- Run after 20261027_redesign.sql. The API works before it runs (page views
-- are stored without view_id/UTM, and time updates use the old matching).

-- One row per page view, identified by the client's view_id (old rows stay NULL).
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS view_id UUID;
-- Unique among non-null values; makes page_view idempotent and view_update a direct lookup.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_view_id_key ON analytics (view_id) WHERE view_id IS NOT NULL;

-- Campaign tags from the landing URL.
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(200);

-- Stable paging order for the summary (created_at, then id).
CREATE INDEX IF NOT EXISTS analytics_created_at_id_idx ON analytics (created_at, id);
