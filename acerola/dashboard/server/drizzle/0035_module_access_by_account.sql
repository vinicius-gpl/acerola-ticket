-- Os módulos passam a valer SÓ pelo id da conta no Neon Auth, e módulo sem linha é sem acesso.
-- Esta migration leva para linhas o que antes valia sem elas, para ninguém perder acesso:
--  1. linha gravada pelo e-mail (no user_id, ou de um login antigo) passa para o id da conta;
--  2. quem não tinha linha nenhuma e tinha papel de Gestor/Administrador na conta do Neon
--     ganha o módulo Sistema com aquele nível — era o que a regra antiga dava.
-- Sem o schema do Neon Auth (banco de teste), não há conta para casar, e nada muda.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'neon_auth' AND table_name = 'user') THEN
    UPDATE "internal_roles" AS r
    SET "user_id" = u."id", "updated_at" = now(), "updated_by" = 'migration'
    FROM neon_auth."user" AS u
    WHERE r."user_id" NOT IN (SELECT "id" FROM neon_auth."user")
      AND (lower(r."user_id") = lower(u."email") OR lower(coalesce(r."user_email", '')) = lower(u."email"))
      AND NOT EXISTS (
        SELECT 1 FROM "internal_roles" AS taken
        WHERE taken."user_id" = u."id" AND taken."context" = r."context"
      );

    INSERT INTO "internal_roles" ("user_id", "user_email", "context", "role", "created_by")
    SELECT u."id", u."email", 'sistema', u."role", 'migration'
    FROM neon_auth."user" AS u
    WHERE u."role" IN ('manager', 'admin')
      AND NOT EXISTS (SELECT 1 FROM "internal_roles" AS r WHERE r."user_id" = u."id")
    ON CONFLICT ("user_id", "context") DO NOTHING;
  END IF;
END $$;
