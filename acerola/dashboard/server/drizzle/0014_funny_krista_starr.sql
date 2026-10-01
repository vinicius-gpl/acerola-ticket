CREATE TABLE "internal_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"context" text DEFAULT 'sistema' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "internal_roles_context_valid" CHECK ("internal_roles"."context" in ('infra', 'sistema', 'manutencao')),
	CONSTRAINT "internal_roles_role_valid" CHECK ("internal_roles"."role" in ('user', 'manager', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "internal_roles_user_context_idx" ON "internal_roles" USING btree ("user_id","context");--> statement-breakpoint
CREATE INDEX "internal_roles_user_id_idx" ON "internal_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "internal_roles_user_email_idx" ON "internal_roles" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "internal_roles_context_idx" ON "internal_roles" USING btree ("context");--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neon_auth' AND table_name = 'user') THEN
    INSERT INTO "internal_roles" ("user_id", "user_email", "context", "role", "created_by")
    SELECT
      "id",
      "email",
      'sistema',
      CASE WHEN "role" IN ('user', 'manager', 'admin') THEN "role" ELSE 'user' END,
      'migration'
    FROM neon_auth."user"
    ON CONFLICT ("user_id", "context") DO NOTHING;
  END IF;
END $$;