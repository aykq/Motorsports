CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"show_non_f1_series" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"pushed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_log_created_at_idx" ON "error_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_log_source_created_at_idx" ON "error_log" USING btree ("source","created_at");