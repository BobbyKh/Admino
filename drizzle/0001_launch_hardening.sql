CREATE TABLE IF NOT EXISTS "page_revisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL REFERENCES "pages"("id") ON DELETE cascade,
  "user_id" integer REFERENCES "admin_users"("id") ON DELETE set null,
  "label" text NOT NULL,
  "snapshot" text NOT NULL,
  "created_at" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "page_revisions_page_id_idx" ON "page_revisions" ("page_id");
CREATE INDEX IF NOT EXISTS "page_revisions_created_at_idx" ON "page_revisions" ("created_at");

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "reset_at" text NOT NULL,
  "updated_at" text NOT NULL
);
