CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  accepted_terms_at INTEGER,
  suspended_at INTEGER,
  suspend_reason TEXT
);
--> statement-breakpoint
INSERT INTO accounts (id, provider, name, created_at, last_seen) SELECT id, 'local', username, created_at, created_at FROM local_accounts;
--> statement-breakpoint
CREATE TABLE user_reports (
  id TEXT PRIMARY KEY NOT NULL,
  target TEXT NOT NULL,
  story_id TEXT,
  reporter TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX user_reports_queue ON user_reports(reviewed_at, created_at);
--> statement-breakpoint
CREATE INDEX user_reports_target ON user_reports(target);
