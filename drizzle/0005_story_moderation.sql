ALTER TABLE stories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE story_reports (
  id TEXT PRIMARY KEY NOT NULL,
  story_id TEXT NOT NULL REFERENCES stories(id),
  reporter TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  UNIQUE(story_id, reporter)
);
--> statement-breakpoint
CREATE INDEX story_reports_queue ON story_reports(reviewed_at, created_at);
