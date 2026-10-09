CREATE TABLE "software_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"repository_url" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"github_repo_owner" text,
	"github_repo_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "software_projects_status_valid" CHECK ("software_projects"."status" in ('active', 'maintenance', 'deprecated')),
	CONSTRAINT "software_projects_color_valid" CHECK ("software_projects"."color" in ('blue', 'green', 'amber', 'purple', 'rose', 'indigo'))
);
--> statement-breakpoint
CREATE TABLE "software_timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"type" text NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"author" text,
	"status" text DEFAULT 'open' NOT NULL,
	"event_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "software_timeline_type_valid" CHECK ("software_timeline_events"."type" in ('pr', 'issue', 'release', 'deploy', 'maintenance')),
	CONSTRAINT "software_timeline_status_valid" CHECK ("software_timeline_events"."status" in ('open', 'merged', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "software_schedule_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "software_schedule_category_valid" CHECK ("software_schedule_events"."category" in ('standup', 'deploy', 'review', 'maintenance', 'critical', 'other')),
	CONSTRAINT "software_schedule_color_valid" CHECK ("software_schedule_events"."color" in ('blue', 'green', 'amber', 'purple', 'rose', 'indigo', 'neutral', 'red'))
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "github_issue_number" integer;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "github_issue_url" text;--> statement-breakpoint
ALTER TABLE "software_timeline_events" ADD CONSTRAINT "software_timeline_events_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."software_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "software_schedule_events" ADD CONSTRAINT "software_schedule_events_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."software_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."software_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "software_projects_status_idx" ON "software_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "software_projects_name_idx" ON "software_projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "software_timeline_project_idx" ON "software_timeline_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "software_timeline_type_idx" ON "software_timeline_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "software_timeline_date_idx" ON "software_timeline_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "software_schedule_project_idx" ON "software_schedule_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "software_schedule_date_idx" ON "software_schedule_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tickets_project_idx" ON "tickets" USING btree ("project_id");
