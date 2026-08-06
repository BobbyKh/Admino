CREATE TABLE "user_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feature" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_features_user_feature_idx" ON "user_features" USING btree ("user_id","feature");--> statement-breakpoint
CREATE INDEX "user_features_user_id_idx" ON "user_features" USING btree ("user_id");