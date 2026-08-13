CREATE TABLE "promotion_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"promotion_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"email" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"type" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"minimum_subtotal" integer DEFAULT 0 NOT NULL,
	"product_ids" text,
	"categories" text,
	"starts_at" text,
	"ends_at" text,
	"usage_limit" integer,
	"per_customer_limit" integer,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "promotion_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_snapshot" text;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_redemptions_order_idx" ON "promotion_redemptions" USING btree ("order_id","promotion_id");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_promotion_idx" ON "promotion_redemptions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_customer_idx" ON "promotion_redemptions" USING btree ("site_id","email","promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_site_code_idx" ON "promotions" USING btree ("site_id","code");--> statement-breakpoint
CREATE INDEX "promotions_site_status_idx" ON "promotions" USING btree ("site_id","status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE set null ON UPDATE no action;