-- schema.sql
-- D1 database schema for Jason Leonard portfolio website

PRAGMA foreign_keys = ON;

-- Main portfolio projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'project',
  tech_stack TEXT,
  github_url TEXT,
  live_url TEXT,
  image_key TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Detailed project case studies
CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  key_features TEXT,
  technical_details TEXT,
  challenges TEXT,
  learnings TEXT,
  tech_stack TEXT,
  github_url TEXT,
  live_url TEXT,
  image_key TEXT,
  cover_image_alt TEXT,
  role TEXT,
  project_type TEXT,
  intended_users TEXT,
  platform TEXT,
  project_status TEXT,
  timeline TEXT,
  content_sections TEXT NOT NULL DEFAULT '[]',
  is_featured INTEGER NOT NULL DEFAULT 0
    CHECK (is_featured IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 0
    CHECK (is_published IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE SET NULL
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_key TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Steam Workshop / hobby items
CREATE TABLE IF NOT EXISTS workshop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  game TEXT NOT NULL,
  description TEXT NOT NULL,
  workshop_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reserved for future R2 media management
CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_slug
  ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_published
  ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_featured
  ON projects(is_featured);

CREATE INDEX IF NOT EXISTS idx_case_studies_slug
  ON case_studies(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_project
  ON case_studies(project_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_published_order
  ON case_studies(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_case_studies_featured
  ON case_studies(is_featured);

CREATE INDEX IF NOT EXISTS idx_blog_slug
  ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published
  ON blog_posts(is_published);

CREATE INDEX IF NOT EXISTS idx_workshop_steam_id
  ON workshop_items(steam_id);
CREATE INDEX IF NOT EXISTS idx_workshop_published
  ON workshop_items(is_published);
