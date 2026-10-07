CREATE TABLE "ticket_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"status_after" text NOT NULL,
	"is_visible_to_requester" boolean DEFAULT true NOT NULL,
	"minutes_spent" integer,
	"author_name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_histories_type_valid" CHECK ("ticket_histories"."type" in ('opening', 'start', 'note', 'waiting_requester', 'waiting_third_party', 'resume', 'update', 'resolution', 'closure_with_caveats', 'cancellation', 'reopening')),
	CONSTRAINT "ticket_histories_status_after_valid" CHECK ("ticket_histories"."status_after" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled')),
	CONSTRAINT "ticket_histories_minutes_not_negative" CHECK ("ticket_histories"."minutes_spent" is null or "ticket_histories"."minutes_spent" >= 0)
);
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_status_valid";--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD COLUMN "history_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_histories" ADD CONSTRAINT "ticket_histories_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_histories_ticket_idx" ON "ticket_histories" USING btree ("ticket_id","created_at");--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_history_id_ticket_histories_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."ticket_histories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_attachments_history_idx" ON "ticket_attachments" USING btree ("history_id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_valid" CHECK ("tickets"."status" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'));