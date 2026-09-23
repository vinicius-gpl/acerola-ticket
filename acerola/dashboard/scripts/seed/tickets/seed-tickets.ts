import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { tickets } from '../../../server/src/lib/db/schema/tickets.schema';
import { openSeedDatabase, report } from '../seed.util';
import { TICKETS_SEED } from './tickets.data';

/**
 * Grava os chamados de teste.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas, e quem atendeu um chamado de teste na tela o vê voltar ao
 * original — que é exatamente o que "rodar o seed" promete.
 */
export async function seedTickets(db: Database): Promise<number> {
  await db
    .insert(tickets)
    .values(TICKETS_SEED)
    .onConflictDoUpdate({
      target: tickets.id,
      set: {
        status: sql`excluded.status`,
        priority: sql`excluded.priority`,
        requesterName: sql`excluded.requester_name`,
        department: sql`excluded.department`,
        problemType: sql`excluded.problem_type`,
        anydeskId: sql`excluded.anydesk_id`,
        contactPhone: sql`excluded.contact_phone`,
        notifyWhatsapp: sql`excluded.notify_whatsapp`,
        description: sql`excluded.description`,
        assignee: sql`excluded.assignee`,
        solution: sql`excluded.solution`,
        createdAt: sql`excluded.created_at`,
        startedAt: sql`excluded.started_at`,
        resolvedAt: sql`excluded.resolved_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await syncIdSequence(db);

  return TICKETS_SEED.length;
}

/**
 * Empurra o contador de `id` para depois do último chamado gravado.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres: ele continua em 1. O próximo
 * chamado aberto pelo formulário pediria o id 1, que já existe, e a pessoa levaria um erro
 * ao pedir socorro — o pior momento possível para o sistema falhar.
 *
 * `coalesce(max(id), 0) + 1` com `false` diz ao Postgres "o PRÓXIMO valor é este", e funciona
 * também com a tabela vazia.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('tickets', 'id'), coalesce((select max(id) from tickets), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:tickets`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('chamados', await seedTickets(db));
    } finally {
      await close();
    }
  });
}
