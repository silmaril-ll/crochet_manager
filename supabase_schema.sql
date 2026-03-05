-- =============================================
-- 毛线助手 Supabase Schema
-- 在 Supabase > SQL Editor 中执行此文件
-- =============================================

-- Projects table (extended from existing)
CREATE TABLE IF NOT EXISTS projects (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  tags        TEXT[] DEFAULT '{}',
  status      TEXT DEFAULT 'in-progress',
  created     TIMESTAMPTZ DEFAULT NOW(),
  completed   TIMESTAMPTZ,
  start_date  DATE,
  end_date    DATE,
  hook_size   TEXT,
  yarn_weight TEXT,
  thumbnail_url TEXT,
  last_opened TIMESTAMPTZ
);

-- Pattern files (images + PDFs)
CREATE TABLE IF NOT EXISTS pattern_files (
  id           BIGSERIAL PRIMARY KEY,
  project_id   BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type    TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  sort_order   BIGINT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Counters (renamed from sections, multi-counter per project)
CREATE TABLE IF NOT EXISTS counters (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '计数器',
  count      INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading lines (one per project)
CREATE TABLE IF NOT EXISTS reading_lines (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  y_position FLOAT DEFAULT 40,
  thickness  INT DEFAULT 40,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yarn inventory (extended from existing)
CREATE TABLE IF NOT EXISTS yarn (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  brand          TEXT,
  weight         TEXT,
  amount         TEXT,
  thumbnail_url  TEXT,
  thumbnail_path TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Storage buckets (run in Supabase dashboard)
-- =============================================
-- Create bucket 'patterns' (public)
-- Create bucket 'yarn-thumbnails' (public)

-- =============================================
-- Row Level Security (optional, for auth)
-- =============================================
-- By default, RLS is disabled = anyone with anon key can read.
-- To enable write protection:
--
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read" ON projects FOR SELECT USING (true);
-- CREATE POLICY "Auth write" ON projects FOR ALL USING (auth.role() = 'authenticated');
-- (Repeat for all tables)
