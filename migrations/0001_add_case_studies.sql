PRAGMA foreign_keys = ON;

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

CREATE INDEX IF NOT EXISTS idx_case_studies_slug
  ON case_studies(slug);

CREATE INDEX IF NOT EXISTS idx_case_studies_project
  ON case_studies(project_id);

CREATE INDEX IF NOT EXISTS idx_case_studies_published_order
  ON case_studies(is_published, display_order);

CREATE INDEX IF NOT EXISTS idx_case_studies_featured
  ON case_studies(is_featured);