CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"location" text,
	"code" text,
	"note" text,
	"photo_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "inventory_items_code_unique" UNIQUE("code"),
	CONSTRAINT "inventory_items_category_valid" CHECK ("inventory_items"."category" in ('furniture', 'pantry', 'cleaning', 'utility', 'appliance', 'other')),
	CONSTRAINT "inventory_items_unit_valid" CHECK ("inventory_items"."unit" in ('unit', 'box', 'package', 'liter', 'kilogram'))
);
--> statement-breakpoint
CREATE INDEX "inventory_items_category_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_items_name_idx" ON "inventory_items" USING btree ("name");