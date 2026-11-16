CREATE TABLE author_handles (
  account_id TEXT PRIMARY KEY NOT NULL,
  handle TEXT NOT NULL UNIQUE
);
--> statement-breakpoint
INSERT OR IGNORE INTO author_handles (account_id, handle) SELECT author, lower(hex(randomblob(6))) FROM (SELECT DISTINCT author FROM stories WHERE author IS NOT NULL);
--> statement-breakpoint
CREATE TABLE story_echoes (
  story_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (story_id, account_id)
);
--> statement-breakpoint
CREATE INDEX story_echoes_account ON story_echoes(account_id);
--> statement-breakpoint
CREATE TABLE story_comments (
  id TEXT PRIMARY KEY NOT NULL,
  story_id TEXT NOT NULL,
  author TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hidden_at INTEGER
);
--> statement-breakpoint
CREATE INDEX story_comments_story ON story_comments(story_id, created_at);
--> statement-breakpoint
CREATE INDEX story_comments_author ON story_comments(author, created_at);
--> statement-breakpoint
CREATE TABLE comment_reports (
  id TEXT PRIMARY KEY NOT NULL,
  comment_id TEXT NOT NULL,
  reporter TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  UNIQUE (comment_id, reporter)
);
--> statement-breakpoint
CREATE INDEX comment_reports_queue ON comment_reports(reviewed_at, created_at);
--> statement-breakpoint
CREATE TABLE library (
  account_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, story_id)
);
--> statement-breakpoint
CREATE TABLE follows (
  follower TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower, author)
);
--> statement-breakpoint
CREATE INDEX follows_author ON follows(author);
