ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "meta_title" text;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "meta_description" text;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "og_image" text;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "canonical_url" text;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "noindex" boolean NOT NULL DEFAULT false;
