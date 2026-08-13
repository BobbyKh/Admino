CREATE TABLE "email_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'newsletter' NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"content" text NOT NULL,
	"product_id" integer,
	"audience" text DEFAULT 'all_subscribers' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" text,
	"queued_at" text,
	"sent_at" text,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"campaign_id" integer,
	"subscriber_id" integer,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" text NOT NULL,
	"locked_at" text,
	"last_error" text,
	"sent_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "email_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'newsletter' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"consent_text" text NOT NULL,
	"consent_ip" text,
	"consent_user_agent" text,
	"confirmation_token_hash" text,
	"unsubscribe_token_hash" text NOT NULL,
	"confirmation_expires_at" text,
	"confirmed_at" text,
	"unsubscribed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "newsletter_subscribers_confirmation_token_hash_unique" UNIQUE("confirmation_token_hash"),
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_hash_unique" UNIQUE("unsubscribe_token_hash")
);
--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_subscriber_id_newsletter_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_campaigns_site_status_idx" ON "email_campaigns" USING btree ("site_id","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "email_jobs_queue_idx" ON "email_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_jobs_campaign_idx" ON "email_jobs" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_site_email_idx" ON "newsletter_subscribers" USING btree ("site_id","email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_site_status_idx" ON "newsletter_subscribers" USING btree ("site_id","status");