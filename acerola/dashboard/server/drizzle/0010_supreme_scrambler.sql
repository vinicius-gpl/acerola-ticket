CREATE TABLE "computer_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"from_department" text,
	"to_department" text,
	"responsible" text,
	"note" text,
	"peripherals_left_behind" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "computer_transfers_from_valid" CHECK ("computer_transfers"."from_department" is null or "computer_transfers"."from_department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computer_transfers_to_valid" CHECK ("computer_transfers"."to_department" is null or "computer_transfers"."to_department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computer_transfers_real_move" CHECK ("computer_transfers"."from_department" is distinct from "computer_transfers"."to_department"),
	CONSTRAINT "computer_transfers_left_behind_not_negative" CHECK ("computer_transfers"."peripherals_left_behind" >= 0)
);
--> statement-breakpoint
ALTER TABLE "computer_transfers" ADD CONSTRAINT "computer_transfers_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "public"."computers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "computer_transfers_computer_time_idx" ON "computer_transfers" USING btree ("computer_id","created_at" DESC NULLS LAST);