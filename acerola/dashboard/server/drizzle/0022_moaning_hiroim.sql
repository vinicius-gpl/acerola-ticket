CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "inventory_movements_type_valid" CHECK ("inventory_movements"."type" in ('in', 'out', 'disposal')),
	CONSTRAINT "inventory_movements_quantity_positive" CHECK ("inventory_movements"."quantity" > 0),
	CONSTRAINT "inventory_movements_reason_matches_type" CHECK (("inventory_movements"."type" = 'disposal' and "inventory_movements"."reason" in ('broken', 'expired', 'obsolete', 'lost', 'other')) or ("inventory_movements"."type" <> 'disposal' and "inventory_movements"."reason" is null))
);
--> statement-breakpoint
CREATE TABLE "maintenance_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier" text NOT NULL,
	"description" text NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"quoted_on" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"note" text,
	"attachment_key" text,
	"attachment_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "maintenance_quotes_kind_valid" CHECK ("maintenance_quotes"."kind" in ('product', 'service', 'other')),
	CONSTRAINT "maintenance_quotes_status_valid" CHECK ("maintenance_quotes"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "maintenance_quotes_amount_not_negative" CHECK ("maintenance_quotes"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_item_time_idx" ON "inventory_movements" USING btree ("item_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inventory_movements_type_time_idx" ON "inventory_movements" USING btree ("type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "maintenance_quotes_status_idx" ON "maintenance_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_quotes_quoted_on_idx" ON "maintenance_quotes" USING btree ("quoted_on" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_balance_not_negative" CHECK ("inventory_items"."balance" >= 0);