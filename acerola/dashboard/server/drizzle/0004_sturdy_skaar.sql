CREATE TABLE "computer_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"metric" text NOT NULL,
	"peak_value" double precision NOT NULL,
	"threshold" double precision NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovered_at" timestamp with time zone,
	"cause_process" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "computer_alerts_metric_valid" CHECK ("computer_alerts"."metric" in ('cpu', 'memory', 'disk')),
	CONSTRAINT "computer_alerts_status_valid" CHECK ("computer_alerts"."status" in ('active', 'recovered'))
);
--> statement-breakpoint
CREATE TABLE "computer_samples" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_percent" double precision NOT NULL,
	"memory_percent" double precision NOT NULL,
	"disk_percent" double precision NOT NULL,
	"network_bytes_per_sec" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "computers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"responsible_name" text,
	"department" text,
	"token_hash" text NOT NULL,
	"os" text,
	"platform" text,
	"platform_version" text,
	"kernel_version" text,
	"arch" text,
	"cpu_model" text,
	"logical_cpus" integer,
	"physical_cpus" integer,
	"total_memory_bytes" bigint,
	"mac_address" text,
	"local_ip" text,
	"total_disk_bytes" bigint,
	"free_disk_bytes" bigint,
	"uptime_seconds" bigint,
	"boot_time" timestamp with time zone,
	"last_snapshot" jsonb,
	"health_score" integer DEFAULT 100 NOT NULL,
	"health_status" text DEFAULT 'good' NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone,
	"agent_version" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"block_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "computers_name_unique" UNIQUE("name"),
	CONSTRAINT "computers_health_status_valid" CHECK ("computers"."health_status" in ('good', 'attention', 'critical')),
	CONSTRAINT "computers_department_valid" CHECK ("computers"."department" is null or "computers"."department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computers_health_score_range" CHECK ("computers"."health_score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "computer_alerts" ADD CONSTRAINT "computer_alerts_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "public"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computer_samples" ADD CONSTRAINT "computer_samples_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "public"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "computer_alerts_computer_time_idx" ON "computer_alerts" USING btree ("computer_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "computer_alerts_status_idx" ON "computer_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "computer_samples_computer_time_idx" ON "computer_samples" USING btree ("computer_id","sampled_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "computer_samples_sampled_at_idx" ON "computer_samples" USING btree ("sampled_at");--> statement-breakpoint
CREATE INDEX "computers_department_idx" ON "computers" USING btree ("department");--> statement-breakpoint
CREATE INDEX "computers_health_status_idx" ON "computers" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "computers_last_seen_idx" ON "computers" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "computers_name_idx" ON "computers" USING btree ("name");