CREATE TABLE "ai_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"source_type" text NOT NULL,
	"source_id" integer,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"path" text,
	"embedding" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "wholesale_tiers" text;--> statement-breakpoint
ALTER TABLE "ai_chunks" ADD CONSTRAINT "ai_chunks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chunks_site_id_idx" ON "ai_chunks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "ai_chunks_source_idx" ON "ai_chunks" USING btree ("source_type","source_id");