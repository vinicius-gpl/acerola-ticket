CREATE TABLE "ticket_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "ticket_areas_area_valid" CHECK ("ticket_areas"."area" in ('infra', 'sistema', 'manutencao'))
);
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_problem_type_valid";--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "area" text DEFAULT 'infra' NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_areas" ADD CONSTRAINT "ticket_areas_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_areas_ticket_area_idx" ON "ticket_areas" USING btree ("ticket_id","area");--> statement-breakpoint
CREATE INDEX "ticket_areas_ticket_idx" ON "ticket_areas" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tickets_area_idx" ON "tickets" USING btree ("area");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_area_valid" CHECK ("tickets"."area" in ('infra', 'sistema', 'manutencao'));--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_problem_type_valid" CHECK ("tickets"."problem_type" in ('network', 'slow_computer', 'printer', 'email', 'internal_system', 'digital_certificate', 'software_install', 'remote_access', 'other', 'bug', 'feature_request', 'access_request', 'data_correction', 'air_conditioning', 'furniture', 'lighting', 'cleaning', 'structural'));