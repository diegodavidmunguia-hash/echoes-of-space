CREATE TABLE local_accounts (
  username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
  id TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE auth_attempts (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX auth_attempts_key_at ON auth_attempts (key, at);
