-- Custom SQL migration file, put your code below! --

-- O CHAMADO É UM REGISTRO, e registro não se reescreve: a linha do tempo e as ordens de serviço
-- emitidas só recebem linhas novas, e um chamado nunca é apagado.
--
-- A regra já existia no código (não há rota nem repositório que altere ou apague). Aqui ela
-- passa a valer no BANCO: quem escrever SQL à mão — ou um código futuro que esqueça a regra —
-- recebe uma recusa, em vez de mudar a história em silêncio.
--
-- O que NÃO é barrado, de propósito: `TRUNCATE`. É como o `npm run db:reset` e os testes
-- esvaziam as tabelas, é um gesto que só o dono do banco consegue fazer, e ele não muda uma
-- linha escondido — leva tudo.

CREATE OR REPLACE FUNCTION "refuse_ticket_record_change"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'table "%" is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Histórico não se corrige nem se apaga. Errou? Lança-se outro.
CREATE TRIGGER "ticket_histories_append_only"
	BEFORE UPDATE OR DELETE ON "ticket_histories"
	FOR EACH ROW EXECUTE FUNCTION "refuse_ticket_record_change"();
--> statement-breakpoint

-- A emissão de uma ordem de serviço é a prova do que saiu do sistema: trocar a impressão
-- digital gravada faria um arquivo adulterado "conferir".
CREATE TRIGGER "ticket_service_orders_append_only"
	BEFORE UPDATE OR DELETE ON "ticket_service_orders"
	FOR EACH ROW EXECUTE FUNCTION "refuse_ticket_record_change"();
--> statement-breakpoint

-- O chamado muda de estágio e de dados (com registro na linha do tempo), mas não some.
CREATE TRIGGER "tickets_never_deleted"
	BEFORE DELETE ON "tickets"
	FOR EACH ROW EXECUTE FUNCTION "refuse_ticket_record_change"();