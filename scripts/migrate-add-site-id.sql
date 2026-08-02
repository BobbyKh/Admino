-- Migration: Add multi-tenant columns to existing tables
-- Run this against your PostgreSQL database before deploying the new code.
-- Usage: psql $DATABASE_URL -f scripts/migrate-add-site-id.sql

-- Add sites table
CREATE TABLE IF NOT EXISTS "sites" (
  "id" SERIAL PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "domain" text,
  "description" text,
  "logo" text,
  "template" text NOT NULL DEFAULT 'blank',
  "published" boolean NOT NULL DEFAULT false,
  "created_at" text NOT NULL DEFAULT (now()::text),
  "updated_at" text NOT NULL DEFAULT (now()::text)
);

-- Add pages table
CREATE TABLE IF NOT EXISTS "pages" (
  "id" SERIAL PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "template" text NOT NULL DEFAULT 'default',
  "published" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" text NOT NULL DEFAULT (now()::text),
  "updated_at" text NOT NULL DEFAULT (now()::text)
);

-- Add page_blocks table
CREATE TABLE IF NOT EXISTS "page_blocks" (
  "id" SERIAL PRIMARY KEY,
  "page_id" integer NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "visible" boolean NOT NULL DEFAULT true,
  "config" text,
  "created_at" text NOT NULL DEFAULT (now()::text),
  "updated_at" text NOT NULL DEFAULT (now()::text)
);

-- Add site_id columns to existing tables (safe: nullable, no data loss)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='site_id') THEN
    ALTER TABLE "settings" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_images' AND column_name='site_id') THEN
    ALTER TABLE "gallery_images" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='site_id') THEN
    ALTER TABLE "menu_categories" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='site_id') THEN
    ALTER TABLE "menu_items" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='site_id') THEN
    ALTER TABLE "bookings" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='site_id') THEN
    ALTER TABLE "messages" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='site_id') THEN
    ALTER TABLE "media" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nav_links' AND column_name='site_id') THEN
    ALTER TABLE "nav_links" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='home_sections' AND column_name='site_id') THEN
    ALTER TABLE "home_sections" ADD COLUMN "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='role') THEN
    ALTER TABLE "admin_users" ADD COLUMN "role" text NOT NULL DEFAULT 'admin';
  END IF;
END $$;

-- Seed default site
INSERT INTO "sites" ("name", "slug", "template", "published", "created_at", "updated_at")
VALUES ('Maiti Resort', 'default', 'restaurant', true, now()::text, now()::text)
ON CONFLICT ("slug") DO NOTHING;

-- Assign all existing data to the default site
UPDATE "settings" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "gallery_images" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "menu_categories" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "menu_items" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "bookings" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "messages" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "media" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "nav_links" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;
UPDATE "home_sections" SET "site_id" = (SELECT "id" FROM "sites" WHERE "slug" = 'default') WHERE "site_id" IS NULL;

-- Seed default homepage for the new page builder system
INSERT INTO "pages" ("site_id", "title", "slug", "description", "template", "published", "sort_order", "created_at", "updated_at")
SELECT "id", 'Home', 'home', 'Homepage', 'default', true, 0, now()::text, now()::text
FROM "sites" WHERE "slug" = 'default'
AND NOT EXISTS (SELECT 1 FROM "pages" WHERE "slug" = 'home');

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'hero', NULL, 0, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id");

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'features', NULL, 1, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id" AND "type" = 'features');

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'about', NULL, 2, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id" AND "type" = 'about');

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'menuPreview', NULL, 3, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id" AND "type" = 'menuPreview');

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'gallery', NULL, 4, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id" AND "type" = 'gallery');

INSERT INTO "page_blocks" ("page_id", "type", "title", "sort_order", "visible", "config", "created_at", "updated_at")
SELECT p."id", 'cta', NULL, 5, true, NULL, now()::text, now()::text
FROM "pages" p WHERE p."slug" = 'home'
AND NOT EXISTS (SELECT 1 FROM "page_blocks" WHERE "page_id" = p."id" AND "type" = 'cta');
