import { inArray, sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { ticketHistories } from '../../../server/src/lib/db/schema/ticket-histories.schema';
import { tickets } from '../../../server/src/lib/db/schema/tickets.schema';
import { openSeedDatabase, report } from '../seed.util';
import { timelineOf } from './ticket-histories.data';
import { TICKETS_SEED } from './tickets.data';

/** Quantas linhas vão por `insert`: o Postgres tem teto de parâmetros por comando. */
const HISTORY_BATCH_SIZE = 500;

/**
 * Grava os chamados de teste QUE AINDA NÃO EXISTEM.
 *
 * `onConflictDoNothing`, e não "reescrever": chamado é registro, e a linha do tempo dele não se
 * altera nem se apaga — o banco recusa (migration `ticket_records_append_only`). Devolver um
 * chamado de teste ao estágio original deixaria a linha do tempo contando uma história e o
 * chamado mostrando outra. O seed, então, só CRIA o que falta; para ver tudo de volta ao
 * original, é `npm run db:reset`, que esvazia as tabelas e grava do zero.
 */
export async function seedTickets(db: Database): Promise<number> {
  await db.insert(tickets).values(TICKETS_SEED).onConflictDoNothing({ target: tickets.id });

  await syncIdSequence(db);
  await seedTimelines(db);

  return TICKETS_SEED.length;
}

/**
 * Grava a LINHA DO TEMPO dos chamados de teste que ainda não têm nenhuma.
 *
 * Só acrescenta: um chamado que já tem história — a que a migration reconstruiu, ou a que
 * alguém lançou pela tela — fica como está. É a mesma regra do sistema inteiro: histórico só
 * entra, nunca sai.
 */
async function seedTimelines(db: Database): Promise<void> {
  const seededIds = TICKETS_SEED.map((ticket) => ticket.id as number);

  const withHistory = await db
    .selectDistinct({ ticketId: ticketHistories.ticketId })
    .from(ticketHistories)
    .where(inArray(ticketHistories.ticketId, seededIds));
  const alreadyTold = withHistory.map((row) => row.ticketId);

  const histories = TICKETS_SEED.filter((ticket) => !alreadyTold.includes(ticket.id as number)).flatMap(
    timelineOf,
  );

  for (let start = 0; start < histories.length; start += HISTORY_BATCH_SIZE) {
    await db.insert(ticketHistories).values(histories.slice(start, start + HISTORY_BATCH_SIZE));
  }
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
