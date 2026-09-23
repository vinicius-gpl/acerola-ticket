CREATE TABLE "part_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"computer_id" integer,
	"handled_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "part_movements_type_valid" CHECK ("part_movements"."type" in ('in', 'out')),
	CONSTRAINT "part_movements_quantity_positive" CHECK ("part_movements"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"condition" text DEFAULT 'new' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "parts_name_condition_unique" UNIQUE("name","condition"),
	CONSTRAINT "parts_category_valid" CHECK ("parts"."category" in ('ssd', 'memory', 'monitor', 'keyboard', 'mouse', 'headset', 'adapter_dp_vga', 'adapter_hdmi_vga', 'desktop', 'other')),
	CONSTRAINT "parts_condition_valid" CHECK ("parts"."condition" in ('new', 'used')),
	CONSTRAINT "parts_balance_not_negative" CHECK ("parts"."balance" >= 0)
);
--> statement-breakpoint
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "public"."computers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_movements_part_time_idx" ON "part_movements" USING btree ("part_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "part_movements_computer_idx" ON "part_movements" USING btree ("computer_id");--> statement-breakpoint
CREATE INDEX "parts_category_idx" ON "parts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "parts_name_idx" ON "parts" USING btree ("name");