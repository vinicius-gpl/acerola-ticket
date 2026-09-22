CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"requester_name" text NOT NULL,
	"department" text NOT NULL,
	"problem_type" text NOT NULL,
	"anydesk_id" text,
	"contact_phone" text,
	"notify_whatsapp" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"screenshot_key" text,
	"assignee" text,
	"solution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "tickets_status_valid" CHECK ("tickets"."status" in ('open', 'in_progress', 'resolved', 'cancelled')),
	CONSTRAINT "tickets_priority_valid" CHECK ("tickets"."priority" in ('low', 'medium', 'high')),
	CONSTRAINT "tickets_department_valid" CHECK ("tickets"."department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "tickets_problem_type_valid" CHECK ("tickets"."problem_type" in ('network', 'slow_computer', 'printer', 'email', 'internal_system', 'digital_certificate', 'software_install', 'remote_access', 'other'))
);
--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_department_idx" ON "tickets" USING btree ("department");--> statement-breakpoint
CREATE INDEX "tickets_problem_type_idx" ON "tickets" USING btree ("problem_type");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");