CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" integer,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"entity_name" text,
	"details" text,
	"ip_address" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_categories" DROP CONSTRAINT "menu_categories_slug_unique";--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'settings'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "settings" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_site_id_idx" ON "activity_logs" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_site_id_idx" ON "bookings" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gallery_images_site_id_idx" ON "gallery_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "home_sections_site_id_idx" ON "home_sections" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "media_site_id_idx" ON "media" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "menu_categories_site_id_idx" ON "menu_categories" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_site_slug_idx" ON "menu_categories" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "menu_items_site_id_idx" ON "menu_items" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_id_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "messages_site_id_idx" ON "messages" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "messages_read_idx" ON "messages" USING btree ("read");--> statement-breakpoint
CREATE INDEX "nav_links_site_id_idx" ON "nav_links" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "page_blocks_page_id_idx" ON "page_blocks" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "pages_site_id_idx" ON "pages" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_slug_idx" ON "pages" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "settings_site_id_idx" ON "settings" USING btree ("site_id");