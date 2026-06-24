CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"series_slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"source" text NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notification_log_sent_at_idx" ON "notification_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "notification_log_series_sent_at_idx" ON "notification_log" USING btree ("series_slug","sent_at");