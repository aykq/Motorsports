CREATE TABLE "cached_circuit" (
	"id" text PRIMARY KEY NOT NULL,
	"series_slug" text NOT NULL,
	"circuit_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cached_circuit_series_circuit" ON "cached_circuit" USING btree ("series_slug","circuit_id");