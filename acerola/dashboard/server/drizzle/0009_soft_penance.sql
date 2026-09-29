CREATE TABLE "network_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link_name" text,
	"provider" text,
	"latency_ms" double precision,
	"packet_loss_percent" double precision,
	"source" text DEFAULT 'UniFi' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "network_events_type_valid" CHECK ("network_events"."type" in ('wan_down', 'wan_up', 'failover', 'high_latency', 'packet_loss', 'other')),
	CONSTRAINT "network_events_severity_valid" CHECK ("network_events"."severity" in ('info', 'attention', 'critical'))
);
--> statement-breakpoint
CREATE INDEX "network_events_occurred_idx" ON "network_events" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "network_events_resolved_idx" ON "network_events" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "network_events_type_idx" ON "network_events" USING btree ("type");