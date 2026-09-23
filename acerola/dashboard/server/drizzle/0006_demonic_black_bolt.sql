CREATE TABLE "maintenances" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer,
	"other_machine" text,
	"type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "maintenances_type_valid" CHECK ("maintenances"."type" in ('preventive', 'corrective', 'part_replacement', 'reinstall', 'cleaning', 'other')),
	CONSTRAINT "maintenances_machine_required" CHECK ("maintenances"."computer_id" is not null or "maintenances"."other_machine" is not null)
);
--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "public"."computers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenances_computer_idx" ON "maintenances" USING btree ("computer_id");--> statement-breakpoint
CREATE INDEX "maintenances_performed_at_idx" ON "maintenances" USING btree ("performed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "maintenances_type_idx" ON "maintenances" USING btree ("type");