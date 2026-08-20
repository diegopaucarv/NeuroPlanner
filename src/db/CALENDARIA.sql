-- Enable foreign keys (required for Expo SQLite)
PRAGMA foreign_keys = ON;

-- ====================
-- 1. Base tables for entities & time series (universal)
-- ====================
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,                     -- UUID
  type TEXT NOT NULL,                      -- 'User', 'Goal', 'Task', 'Habit', 'Reward', 'Assessment', ...
  created_at INTEGER NOT NULL,             -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL                       -- JSON: all domain-specific fields
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_created ON entities(created_at);

-- Time series for any Trackable entity
CREATE TABLE IF NOT EXISTS time_series (
  entity_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,              -- ms
  metric_name TEXT NOT NULL,               -- 'stress', 'social_battery', 'mastery'
  value REAL NOT NULL,
  context TEXT,                            -- JSON
  FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ts_entity ON time_series(entity_id, metric_name, timestamp);

-- ====================
-- 2. Images (preserved from old schema, but now FK to entities)
-- ====================
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,                     -- UUID
  entity_id TEXT NOT NULL,                 -- which entity owns this image
  image_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_id);

-- ====================
-- 3. Specialised table for objectives (polymorphic)
-- We already have 'entities' but we add an indexed view or separate table for fast queries.
-- For simplicity, we'll query entities WHERE type IN ('Goal','Project','Task','Habit').
-- But we keep a dedicated 'objectives' table for hierarchy (parent/child).
-- ====================
CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  parent_id TEXT,                          -- for hierarchy (Goal -> subgoal, Project -> Task, etc.)
  progress REAL DEFAULT 0 CHECK(progress BETWEEN 0 AND 1),
  is_active INTEGER DEFAULT 1,             -- 1 = active, 0 = paused/archived
  due_date INTEGER,                        -- timestamp (optional)
  sort_order INTEGER DEFAULT 0,            -- child ordering among siblings
  FOREIGN KEY(id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES objectives(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_id);
CREATE INDEX IF NOT EXISTS idx_objectives_due ON objectives(due_date);
CREATE INDEX IF NOT EXISTS idx_objectives_active ON objectives(is_active);
CREATE INDEX IF NOT EXISTS idx_objectives_sort ON objectives(parent_id, sort_order);

-- Many-to-many links between objectives (e.g., Goal contains Task)
CREATE TABLE IF NOT EXISTS objective_links (
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  PRIMARY KEY(parent_id, child_id),
  FOREIGN KEY(parent_id) REFERENCES objectives(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- ====================
-- 4. Habits (specialised, linked to task_block idea from old schema)
-- task_block becomes a reusable habit template.
-- ====================
CREATE TABLE IF NOT EXISTS habit_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_minutes INTEGER,
  default_priority INTEGER,
  tags TEXT,                               -- JSON array
  image_id TEXT,
  FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE SET NULL
);

-- Instances of habits (each occurrence)
CREATE TABLE IF NOT EXISTS habit_instances (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  scheduled_date INTEGER NOT NULL,         -- date only (start of day)
  completed INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  FOREIGN KEY(template_id) REFERENCES habit_templates(id) ON DELETE CASCADE
);

-- ====================
-- 5. Rewards (premios) – enhanced with images and tags
-- ====================
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  is_favorite INTEGER DEFAULT 0,
  effort_required INTEGER,                 -- minimal points or difficulty
  tags TEXT,                               -- JSON
  color TEXT,
  image_id TEXT,
  FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE SET NULL
);

-- User reward redemption history
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL,
  points_spent INTEGER,
  FOREIGN KEY(user_id) REFERENCES entities(id),
  FOREIGN KEY(reward_id) REFERENCES rewards(id)
);

-- ====================
-- 6. Social battery (separate table for real-time tracking)
-- ====================
CREATE TABLE IF NOT EXISTS social_battery (
  id TEXT PRIMARY KEY,                     -- same as user entity id
  current_level INTEGER NOT NULL CHECK(current_level BETWEEN 0 AND 100),
  recovery_rate REAL,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY(id) REFERENCES entities(id) ON DELETE CASCADE
);

-- ====================
-- 7. Assessments (specific fields are JSON in entities.data, but we can store scores separate)
-- ====================
-- No separate table – assessment results are stored in entities with type 'Assessment' or subclass.
-- Answers are in data.answers (JSON). Scores can be indexed in a virtual table if needed.

-- ====================
-- 8. Calendar & scheduling (recovery blocks, nudges)
-- ====================
CREATE TABLE IF NOT EXISTS calendar_items (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,                  -- user
  type TEXT NOT NULL CHECK(type IN ('recovery_block','nudge','task_slot')),
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  data TEXT,                               -- JSON (message, vibration pattern, etc.)
  FOREIGN KEY(owner_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_calendar_owner ON calendar_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_times ON calendar_items(start_time, end_time);

-- ====================
-- 9. Skills, drills, feedback (simplified)
-- ====================
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mastery REAL DEFAULT 0,
  anxiety_required INTEGER,
  type TEXT CHECK(type IN ('social','emotional'))
);

CREATE TABLE IF NOT EXISTS drills (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  duration_seconds INTEGER,
  FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drill_sessions (
  id TEXT PRIMARY KEY,
  drill_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  success INTEGER DEFAULT 0,
  feedback TEXT,                           -- JSON rating/comment
  FOREIGN KEY(drill_id) REFERENCES drills(id),
  FOREIGN KEY(user_id) REFERENCES entities(id)
);

-- ====================
-- 10. Reflection records (journal, conversations, crisis)
-- ====================
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('journal','conversation','crisis','medication')),
  timestamp INTEGER NOT NULL,
  data TEXT NOT NULL,                      -- JSON (mood, transcript, etc.)
  FOREIGN KEY(user_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON reflections(user_id);

-- ====================
-- 11. Support network
-- ====================
CREATE TABLE IF NOT EXISTS support_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT,
  email TEXT,
  escalation_level INTEGER,                -- 1-4 (low to critical)
  FOREIGN KEY(user_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- ====================
-- 12. Health metrics (daily aggregates)
-- ====================
CREATE TABLE IF NOT EXISTS health_metrics_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  stress INTEGER CHECK(stress BETWEEN 0 AND 10),
  anxiety INTEGER CHECK(anxiety BETWEEN 0 AND 10),
  social_anxiety INTEGER CHECK(social_anxiety BETWEEN 0 AND 10),
  recovery_pct REAL CHECK(recovery_pct BETWEEN 0 AND 100),
  social_initiative INTEGER CHECK(social_initiative BETWEEN 0 AND 10),
  UNIQUE(user_id, date),
  FOREIGN KEY(user_id) REFERENCES entities(id) ON DELETE CASCADE
);
