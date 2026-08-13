ALTER TABLE "orders" ADD COLUMN "inventory_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_reserved_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_expires_at" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_finalized_at" text;--> statement-breakpoint
UPDATE "orders" SET "inventory_status" = 'committed', "inventory_finalized_at" = COALESCE("updated_at", "created_at") WHERE "payment_status" = 'paid' OR "status" = 'fulfilled' OR ("payment_provider" = 'cod' AND "status" = 'pending');--> statement-breakpoint
UPDATE "orders" SET "inventory_status" = 'reserved', "inventory_reserved_at" = "created_at", "inventory_expires_at" = ("created_at"::timestamptz + INTERVAL '24 hours')::text WHERE "status" = 'pending' AND "payment_provider" IN ('qr', 'esewa') AND "inventory_status" = 'none';--> statement-breakpoint
UPDATE "orders" SET "inventory_status" = 'released', "inventory_finalized_at" = COALESCE("updated_at", "created_at") WHERE ("status" = 'cancelled' OR "payment_status" IN ('failed', 'expired')) AND "payment_provider" <> 'stripe' AND "inventory_status" = 'none';--> statement-breakpoint
CREATE INDEX "orders_inventory_expiry_idx" ON "orders" USING btree ("inventory_status","inventory_expires_at");
