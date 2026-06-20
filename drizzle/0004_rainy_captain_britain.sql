CREATE TABLE "cached_news" (
	"id" text PRIMARY KEY NOT NULL,
	"series_slug" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"summary" text,
	"content" text,
	"author" text,
	"published_at" timestamp,
	"scraped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cached_news_url_idx" ON "cached_news" USING btree ("url");