CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"category_id" integer,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_categories_site_id_idx" ON "service_categories" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_site_slug_idx" ON "service_categories" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "services_site_id_idx" ON "services" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "services_category_id_idx" ON "services" USING btree ("category_id");