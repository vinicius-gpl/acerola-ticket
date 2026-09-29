ALTER TABLE "ticket_attachments" ADD COLUMN "origin" text DEFAULT 'requester' NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_origin_valid" CHECK ("ticket_attachments"."origin" in ('requester', 'support'));--> statement-breakpoint
-- O que ja existia recebe o lado certo, e nao o padrao.
-- Ate aqui, so o TI tinha identidade para carimbar: anexo com autor veio do painel, durante
-- o atendimento; anexo sem autor veio junto com a abertura do chamado. Sem esta linha, tudo
-- que o TI ja tinha anexado nasceria como arquivo de quem abriu — e o proprio TI ficaria sem
-- poder apagar o que ele mesmo subiu.
UPDATE "ticket_attachments" SET "origin" = 'support' WHERE "created_by" IS NOT NULL;
