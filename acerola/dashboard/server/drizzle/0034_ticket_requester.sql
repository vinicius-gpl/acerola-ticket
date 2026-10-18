ALTER TABLE "tickets" ADD COLUMN "requester_id" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "requester_email" text;--> statement-breakpoint
CREATE INDEX "tickets_requester_id_idx" ON "tickets" USING btree ("requester_id");