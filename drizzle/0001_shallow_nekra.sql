CREATE TABLE "cached_race_detail" (
	"id" text PRIMARY KEY NOT NULL,
	"series_slug" text NOT NULL,
	"season" integer NOT NULL,
	"round" integer NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme" text;--> statement-breakpoint
CREATE UNIQUE INDEX "cached_race_detail_idx" ON "cached_race_detail" USING btree ("series_slug","season","round");