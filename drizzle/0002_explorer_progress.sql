CREATE TABLE explorer_progress (
  owner TEXT NOT NULL,
  story_id TEXT NOT NULL,
  is_read INTEGER CHECK (is_read IN (0, 1)),
  PRIMARY KEY (owner, story_id)
);
