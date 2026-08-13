CREATE TABLE "seller_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"business_name" text NOT NULL,
	"legal_name" text,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"website" text,
	"tax_id" text,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_by" integer,
	"reviewed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"application_id" integer NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"country" text NOT NULL,
	"tax_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"verified_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "seller_organizations_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "seller_stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_seller_id_seller_organizations_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_organizations" ADD CONSTRAINT "seller_organizations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_organizations" ADD CONSTRAINT "seller_organizations_application_id_seller_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."seller_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_stores" ADD CONSTRAINT "seller_stores_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_stores" ADD CONSTRAINT "seller_stores_seller_id_seller_organizations_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_applications_site_email_idx" ON "seller_applications" USING btree ("site_id","email");--> statement-breakpoint
CREATE INDEX "seller_applications_site_status_idx" ON "seller_applications" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_members_seller_user_idx" ON "seller_members" USING btree ("seller_id","user_id");--> statement-breakpoint
CREATE INDEX "seller_members_site_user_idx" ON "seller_members" USING btree ("site_id","user_id");--> statement-breakpoint
CREATE INDEX "seller_organizations_site_id_idx" ON "seller_organizations" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_organizations_site_email_idx" ON "seller_organizations" USING btree ("site_id","contact_email");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_stores_site_slug_idx" ON "seller_stores" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "seller_stores_seller_id_idx" ON "seller_stores" USING btree ("seller_id");