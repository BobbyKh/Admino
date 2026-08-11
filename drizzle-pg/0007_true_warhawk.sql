CREATE TABLE "block_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"config" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"visitor_id" text NOT NULL,
	"path" text NOT NULL,
	"selector" text,
	"x" integer,
	"y" integer,
	"label" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_funnels" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"steps" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"label" text DEFAULT 'Home' NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"city" text NOT NULL,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'US' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"level" text DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"url" text,
	"method" text,
	"status_code" integer,
	"user_agent" text,
	"ip_address" text,
	"context" text,
	"resolved" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"experiment_id" integer NOT NULL,
	"visitor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"assigned_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"experiment_id" integer NOT NULL,
	"visitor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"event" text NOT NULL,
	"value" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"traffic_percent" integer DEFAULT 50 NOT NULL,
	"variants" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"user_id" integer,
	"label" text NOT NULL,
	"snapshot" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"slug" text,
	"description" text,
	"meta_title" text,
	"meta_description" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"page_id" integer,
	"path" text NOT NULL,
	"visitor_id" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"ip_hash" text,
	"country" text,
	"device" text,
	"browser" text,
	"os" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"duration" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"features" text,
	"max_pages" integer DEFAULT 10 NOT NULL,
	"max_products" integer DEFAULT 50 NOT NULL,
	"max_storage_mb" integer DEFAULT 1000 NOT NULL,
	"max_bandwidth_gb" integer DEFAULT 10 NOT NULL,
	"stripe_price_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_locales" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"current_period_start" text,
	"current_period_end" text,
	"cancel_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_retry_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text DEFAULT '[]' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
DROP INDEX "cart_items_cart_product_idx";--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "selected_options" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "selected_options" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_notes" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "noindex" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_status" text DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_verified_at" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_last_checked_at" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_error" text;--> statement-breakpoint
ALTER TABLE "block_translations" ADD CONSTRAINT "block_translations_block_id_page_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."page_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_funnels" ADD CONSTRAINT "conversion_funnels_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_events" ADD CONSTRAINT "experiment_events_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_locales" ADD CONSTRAINT "site_locales_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_translations_block_id_idx" ON "block_translations" USING btree ("block_id");--> statement-breakpoint
CREATE UNIQUE INDEX "block_translations_block_locale_idx" ON "block_translations" USING btree ("block_id","locale");--> statement-breakpoint
CREATE INDEX "click_events_site_id_idx" ON "click_events" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "click_events_path_idx" ON "click_events" USING btree ("path");--> statement-breakpoint
CREATE INDEX "click_events_created_at_idx" ON "click_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversion_funnels_site_id_idx" ON "conversion_funnels" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_site_id_idx" ON "customers" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_site_email_idx" ON "customers" USING btree ("site_id","email");--> statement-breakpoint
CREATE INDEX "error_logs_site_id_idx" ON "error_logs" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "error_logs_level_idx" ON "error_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "error_logs_resolved_idx" ON "error_logs" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "experiment_assignments_experiment_id_idx" ON "experiment_assignments" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "experiment_assignments_visitor_id_idx" ON "experiment_assignments" USING btree ("visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_assignments_exp_visitor_idx" ON "experiment_assignments" USING btree ("experiment_id","visitor_id");--> statement-breakpoint
CREATE INDEX "experiment_events_experiment_id_idx" ON "experiment_events" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "experiment_events_event_idx" ON "experiment_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "experiment_events_created_at_idx" ON "experiment_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "experiments_site_id_idx" ON "experiments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "experiments_status_idx" ON "experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_revisions_page_id_idx" ON "page_revisions" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_revisions_created_at_idx" ON "page_revisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_translations_page_id_idx" ON "page_translations" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_translations_page_locale_idx" ON "page_translations" USING btree ("page_id","locale");--> statement-breakpoint
CREATE INDEX "page_views_site_id_idx" ON "page_views" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "page_views_page_id_idx" ON "page_views" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("path");--> statement-breakpoint
CREATE INDEX "page_views_visitor_id_idx" ON "page_views" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_views_country_idx" ON "page_views" USING btree ("country");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "site_locales_site_id_idx" ON "site_locales" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "site_locales_site_code_idx" ON "site_locales" USING btree ("site_id","code");--> statement-breakpoint
CREATE INDEX "subscriptions_site_id_idx" ON "subscriptions" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries" USING btree ("event");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhooks_site_id_idx" ON "webhooks" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_customer_product_idx" ON "wishlists" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "wishlists_customer_id_idx" ON "wishlists" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_options_idx" ON "cart_items" USING btree ("cart_id","product_id","selected_options");--> statement-breakpoint
CREATE INDEX "carts_customer_id_idx" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");