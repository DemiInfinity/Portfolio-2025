-- 20261028_owner_decisions.sql
-- v2 of the redesign (owner decisions D-1, D-2, D-4, D-6, D-7, D-8). Idempotent.
-- Run in the Supabase SQL editor AFTER 20261027_redesign.sql and BEFORE
-- deploying the new API. The seeds copy the current design copy, so nothing
-- changes visually on deploy.

-- D-1, D-6: editable site content (one row per key)
CREATE TABLE IF NOT EXISTS site_content (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
INSERT INTO site_content (key, value) VALUES ('about', $json${
  "intro": [
    "I'm Demi, a full-stack software engineer with five years of building real products: payroll platforms, learning platforms, desktop tools and, after hours, my own apps.",
    "I love the whole stack, but my heart is in the front end and the systems behind it: component libraries, design tokens and the small details that make an interface feel finished. These days I'm also deep into AI tooling, building MCP servers that help developers generate code that actually fits their design system."
  ],
  "looking_for": {
    "summary": "A remote role I can do from anywhere. I'm set up for remote work and open to working as a digital nomad.",
    "items": [
      {"label": "Work style", "value": "Fully remote, digital nomad friendly"},
      {"label": "Roles", "value": "Full-stack or frontend-leaning engineer"},
      {"label": "Sweet spot", "value": "Design systems, component libraries, AI tooling"},
      {"label": "Based", "value": "UK, flexible across time zones"},
      {"label": "Also open to", "value": "Freelance projects"}
    ]
  },
  "open_to_work_off_line": "Happily at Cintra, always up for a chat",
  "cv_headline": "Full-stack Software Engineer",
  "cv_profile": "Full-stack software engineer with five years' experience building enterprise platforms, desktop tools and creator products. I specialise in component libraries and design systems, care as much about how software looks as how it runs, and work with a pragmatic, AI-assisted workflow. Looking for a fully remote role, and open to working as a digital nomad.",
  "cv_ai_workflow": "AI-assisted, never AI-driven: I own the problem, the architecture and the final review, and use AI to move faster. Claude daily at work and at home; experience with Cursor; ChatGPT, moving to Codex at work. Built an MCP server so AI tools generate code that fits our design system.",
  "contact": {
    "email": "demi.21@outlook.com",
    "linkedin_url": "https://www.linkedin.com/in/demi-taylor-nimmo-bb320b40",
    "github_url": "https://github.com/DemiInfinity",
    "portfolio_url": "https://www.demitaylornimmo.com",
    "location": "UK · Remote"
  }
}$json$::jsonb)
ON CONFLICT (key) DO NOTHING;

-- D-1: recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  quote TEXT NOT NULL,
  full_text TEXT,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(160),
  company VARCHAR(160),
  relationship VARCHAR(200),
  source VARCHAR(80),
  source_url TEXT,
  date DATE,
  show_on_cv BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO recommendations (quote, full_text, name, role, company, relationship, source, date, show_on_cv, sort_order)
SELECT 'Her upbeat and friendly attitude brought so much warmth to the team. Demi has a real talent for connecting with people and is always eager to learn and improve.',
       NULL, 'Adam Mellor', 'Team lead', '3T Global', 'managed Demi directly', 'LinkedIn', '2025-01-01', true, 0
WHERE NOT EXISTS (SELECT 1 FROM recommendations);
-- (the owner pastes the full recommendation text into full_text from the admin)
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY; -- no policies: only the API (service role)

-- D-2: structured case studies
ALTER TABLE projects ADD COLUMN IF NOT EXISTS case_study JSONB;
-- D-4: show on site
ALTER TABLE projects ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT true;

-- D-7: email delivery record
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (email_status IN ('pending','sent','skipped','failed'));
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS email_error TEXT;

-- D-8: CV PDF build state (single row, id = 1)
CREATE TABLE IF NOT EXISTS cv_build (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (state IN ('idle','pending','building','failed')),
  requested_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  content_hash VARCHAR(64),
  pdf_path TEXT,
  size_bytes INTEGER,
  error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO cv_build (id, state, requested_at) VALUES (1, 'pending', now()) ON CONFLICT (id) DO NOTHING;
ALTER TABLE cv_build ENABLE ROW LEVEL SECURITY;
