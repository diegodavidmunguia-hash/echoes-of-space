ALTER TABLE stories ADD COLUMN byline TEXT;
--> statement-breakpoint
ALTER TABLE stories ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE stories ADD COLUMN series_id TEXT;
--> statement-breakpoint
ALTER TABLE stories ADD COLUMN series_name TEXT;
--> statement-breakpoint
ALTER TABLE stories ADD COLUMN part INTEGER;
--> statement-breakpoint
ALTER TABLE stories ADD COLUMN attachment TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX stories_series_part ON stories (series_id, part) WHERE series_id IS NOT NULL;
