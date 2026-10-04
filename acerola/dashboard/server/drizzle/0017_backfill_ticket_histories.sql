-- Custom SQL migration file, put your code below! --

-- Os chamados que já existiam nasceram antes da linha do tempo: tinham só o estado final
-- (situação, responsável, o que foi feito). Aqui cada um ganha os históricos que dá para
-- reconstruir com verdade a partir desses carimbos — a abertura, o início e o encerramento.
-- O que aconteceu no meio não foi registrado na época, e não se inventa.

-- A abertura: todo chamado tem uma, de quem abriu, na data em que abriu.
INSERT INTO "ticket_histories" ("ticket_id", "type", "description", "status_after", "is_visible_to_requester", "author_name", "created_by", "created_at")
SELECT t."id", 'opening', 'Chamado aberto.', 'open', true, t."requester_name", NULL, t."created_at"
FROM "tickets" t
WHERE NOT EXISTS (
	SELECT 1 FROM "ticket_histories" h WHERE h."ticket_id" = t."id" AND h."type" = 'opening'
);
--> statement-breakpoint

-- O início do atendimento, quando houve um antes do encerramento. Chamado resolvido na hora
-- tem os dois carimbos iguais, e aí o encerramento sozinho conta a história.
INSERT INTO "ticket_histories" ("ticket_id", "type", "description", "status_after", "is_visible_to_requester", "author_name", "created_by", "created_at")
SELECT t."id", 'start', 'Atendimento iniciado.', 'in_progress', true, coalesce(nullif(trim(t."assignee"), ''), 'Suporte'), t."updated_by", t."started_at"
FROM "tickets" t
WHERE t."started_at" IS NOT NULL
	AND (t."resolved_at" IS NULL OR t."started_at" < t."resolved_at")
	AND NOT EXISTS (
		SELECT 1 FROM "ticket_histories" h WHERE h."ticket_id" = t."id" AND h."type" = 'start'
	);
--> statement-breakpoint

-- A solução: o texto de "o que foi feito" vira o histórico que encerrou o chamado. Fica
-- escondido de quem abriu: quando foi escrito, esse texto não saía na consulta pública, e
-- publicá-lo agora seria mostrar o que o autor escreveu achando que só o TI leria.
INSERT INTO "ticket_histories" ("ticket_id", "type", "description", "status_after", "is_visible_to_requester", "author_name", "created_by", "created_at")
SELECT t."id", 'resolution', coalesce(nullif(trim(t."solution"), ''), 'Chamado resolvido.'), 'resolved', false, coalesce(nullif(trim(t."assignee"), ''), 'Suporte'), t."updated_by", coalesce(t."resolved_at", t."updated_at", t."created_at")
FROM "tickets" t
WHERE t."status" = 'resolved'
	AND NOT EXISTS (
		SELECT 1 FROM "ticket_histories" h WHERE h."ticket_id" = t."id" AND h."type" = 'resolution'
	);
--> statement-breakpoint

-- O cancelamento, pela mesma regra.
INSERT INTO "ticket_histories" ("ticket_id", "type", "description", "status_after", "is_visible_to_requester", "author_name", "created_by", "created_at")
SELECT t."id", 'cancellation', coalesce(nullif(trim(t."solution"), ''), 'Chamado cancelado.'), 'cancelled', false, coalesce(nullif(trim(t."assignee"), ''), 'Suporte'), t."updated_by", coalesce(t."updated_at", t."created_at")
FROM "tickets" t
WHERE t."status" = 'cancelled'
	AND NOT EXISTS (
		SELECT 1 FROM "ticket_histories" h WHERE h."ticket_id" = t."id" AND h."type" = 'cancellation'
	);
