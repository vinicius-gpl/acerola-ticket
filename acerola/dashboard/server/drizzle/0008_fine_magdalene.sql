ALTER TABLE "computers" ADD COLUMN "disposed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "computers" ADD COLUMN "disposal_type" text;--> statement-breakpoint
ALTER TABLE "computers" ADD COLUMN "disposal_reason" text;--> statement-breakpoint
CREATE INDEX "computers_disposed_idx" ON "computers" USING btree ("disposed_at");--> statement-breakpoint
ALTER TABLE "computers" ADD CONSTRAINT "computers_disposal_complete" CHECK (("computers"."disposed_at" is null and "computers"."disposal_type" is null and "computers"."disposal_reason" is null)
        or ("computers"."disposed_at" is not null and "computers"."disposal_type" is not null and "computers"."disposal_reason" is not null));--> statement-breakpoint
ALTER TABLE "computers" ADD CONSTRAINT "computers_disposal_type_valid" CHECK ("computers"."disposal_type" is null or "computers"."disposal_type" in ('defect', 'scrap'));