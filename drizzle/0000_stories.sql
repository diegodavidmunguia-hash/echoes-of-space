CREATE TABLE stories (
  id TEXT PRIMARY KEY NOT NULL,
  destination TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  hardware TEXT NOT NULL,
  body TEXT NOT NULL,
  sources TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX stories_author_time ON stories (author, created_at);
--> statement-breakpoint
CREATE INDEX stories_time ON stories (created_at, id);
