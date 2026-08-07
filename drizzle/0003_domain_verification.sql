ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "domain_status" text NOT NULL DEFAULT 'not_configured';
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "domain_verified_at" text;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "domain_last_checked_at" text;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "domain_error" text;
