-- Fix Missing Columns in Supabase Database
-- Run this in Supabase SQL Editor to add missing columns

-- Add missing columns to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS author VARCHAR(255) DEFAULT 'Demi Taylor Nimmo',
ADD COLUMN IF NOT EXISTS read_time INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Project card / thumbnail image (full URL, e.g. Supabase Storage public URL)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS image TEXT;

-- Add missing columns to analytics table  
ALTER TABLE analytics
ADD COLUMN IF NOT EXISTS page_title VARCHAR(500),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS visit_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) NOT NULL DEFAULT 'page_view';

-- Add missing columns to education table
ALTER TABLE education
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add missing columns to certifications table
ALTER TABLE certifications
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS skills JSONB;

-- Create learning table for future learning goals
CREATE TABLE IF NOT EXISTS learning (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    category VARCHAR(100) NOT NULL,
    start_date DATE,
    estimated_completion DATE,
    resources JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample feature flags
INSERT INTO feature_flags (name, description, enabled) VALUES
('dark_mode', 'Enable dark mode theme', true),
('beta_features', 'Enable beta features for testing', false),
('analytics_tracking', 'Enable advanced analytics tracking', true),
('maintenance_mode', 'Enable maintenance mode banner', false)
ON CONFLICT (name) DO NOTHING;

-- Update existing blog posts to have author and read_time
UPDATE blog_posts 
SET author = 'Demi Taylor Nimmo', read_time = 5 
WHERE author IS NULL OR read_time IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('blog_posts', 'projects', 'analytics', 'education', 'certifications', 'learning', 'feature_flags')
ORDER BY table_name, ordinal_position;
