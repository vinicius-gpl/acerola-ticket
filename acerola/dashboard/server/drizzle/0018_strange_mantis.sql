CREATE TABLE "ticket_service_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"version" integer NOT NULL,
	"code" text NOT NULL,
	"file_hash" text NOT NULL,
	"status_at_issue" text NOT NULL,
	"history_count" integer NOT NULL,
	"total_minutes" integer,
	"issued_by_name" text NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_service_orders_version_positive" CHECK ("ticket_service_orders"."version" > 0),
	CONSTRAINT "ticket_service_orders_status_valid" CHECK ("ticket_service_orders"."status_at_issue" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "ticket_service_orders" ADD CONSTRAINT "ticket_service_orders_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_service_orders_code_unique" ON "ticket_service_orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_service_orders_version_unique" ON "ticket_service_orders" USING btree ("ticket_id","version");--> statement-breakpoint
CREATE INDEX "ticket_service_orders_hash_idx" ON "ticket_service_orders" USING btree ("file_hash");