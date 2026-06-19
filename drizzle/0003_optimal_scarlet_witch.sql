CREATE TABLE "sent_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"series_slug" text NOT NULL,
	"season" integer NOT NULL,
	"round" integer NOT NULL,
	"session_type" text NOT NULL,
	"notif_type" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscription" ADD COLUMN "session_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sent_notification_unique_idx" ON "sent_notification" USING btree ("series_slug","season","round","session_type","notif_type");