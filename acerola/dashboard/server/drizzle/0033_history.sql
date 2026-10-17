CREATE TABLE "history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"target_type" text,
	"target_id" text,
	"target_label" text,
	"ip" text,
	"user_agent" text,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "history_occurred_at_idx" ON "history" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "history_target_idx" ON "history" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "history_actor_id_idx" ON "history" USING btree ("actor_id");