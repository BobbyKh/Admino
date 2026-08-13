CREATE TABLE "seller_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"accepted_at" text,
	"created_by" integer,
	"created_at" text NOT NULL,
	CONSTRAINT "seller_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "seller_members" DROP CONSTRAINT "seller_members_user_id_admin_users_id_fk";
--> statement-breakpoint
DELETE FROM "seller_members";--> statement-breakpoint
DROP INDEX "seller_members_seller_user_idx";--> statement-breakpoint
DROP INDEX "seller_members_site_user_idx";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "seller_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "store_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seller_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_id" integer;--> statement-breakpoint
ALTER TABLE "seller_accounts" ADD CONSTRAINT "seller_accounts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_invitations" ADD CONSTRAINT "seller_invitations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_invitations" ADD CONSTRAINT "seller_invitations_seller_id_seller_organizations_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_invitations" ADD CONSTRAINT "seller_invitations_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_accounts_site_email_idx" ON "seller_accounts" USING btree ("site_id","email");--> statement-breakpoint
CREATE INDEX "seller_accounts_site_id_idx" ON "seller_accounts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "seller_invitations_seller_email_idx" ON "seller_invitations" USING btree ("seller_id","email");--> statement-breakpoint
CREATE INDEX "seller_invitations_token_hash_idx" ON "seller_invitations" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_seller_organizations_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_id_seller_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."seller_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_seller_organizations_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_seller_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."seller_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_user_id_seller_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."seller_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_seller_id_idx" ON "order_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "products_seller_id_idx" ON "products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_members_seller_account_idx" ON "seller_members" USING btree ("seller_id","user_id");--> statement-breakpoint
CREATE INDEX "seller_members_site_account_idx" ON "seller_members" USING btree ("site_id","user_id");
