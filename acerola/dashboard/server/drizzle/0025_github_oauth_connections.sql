CREATE TABLE "github_connections" (
  "user_id" text PRIMARY KEY NOT NULL,
  "github_id" text NOT NULL UNIQUE,
  "login" text NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp with time zone,
  "refresh_expires_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_oauth_states" (
  "state_hash" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "browser_hash" text NOT NULL,
  "code_verifier" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);
