CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image" text,
	"category" text,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_posts_site_id_idx" ON "blog_posts" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_site_slug_idx" ON "blog_posts" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("site_id","published","published_at");