-- Duas sincronizações ao mesmo tempo podiam gravar o mesmo PR ou issue duas vezes no mesmo
-- sistema. Antes do índice único, fica só o mais antigo de cada repetido (sem isto o índice
-- não é criado e a migration para).
DELETE FROM "software_timeline_events" AS duplicate
USING "software_timeline_events" AS kept
WHERE duplicate."external_id" IS NOT NULL
  AND duplicate."project_id" = kept."project_id"
  AND duplicate."type" = kept."type"
  AND duplicate."external_id" = kept."external_id"
  AND duplicate."id" > kept."id";--> statement-breakpoint
CREATE UNIQUE INDEX "software_timeline_external_unique" ON "software_timeline_events" USING btree ("project_id","type","external_id");
