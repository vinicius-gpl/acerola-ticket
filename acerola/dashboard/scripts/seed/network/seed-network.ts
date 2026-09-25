import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { networkEvents } from '../../../server/src/lib/db/schema/network-events.schema';
import { openSeedDatabase, report } from '../seed.util';
import { NETWORK_EVENTS_SEED } from './network.data';

/**
 * Grava os eventos de rede de teste.
 *
 * Não depende de nenhuma outra entidade: um evento de rede é do link de internet, não de uma
 * máquina. Por isso ele pode entrar em qualquer ponto da ordem do `seed-all`.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas, e quem marcou um evento como resolvido na tela o vê voltar ao
 * original.
 */
export async function seedNetwork(db: Database): Promise<number> {
  await db
    .insert(networkEvents)
    .values(NETWORK_EVENTS_SEED)
    .onConflictDoUpdate({
      target: networkEvents.id,
      set: {
        occurredAt: sql`excluded.occurred_at`,
        type: sql`excluded.type`,
        severity: sql`excluded.severity`,
        title: sql`excluded.title`,
        message: sql`excluded.message`,
        linkName: sql`excluded.link_name`,
        provider: sql`excluded.provider`,
        latencyMs: sql`excluded.latency_ms`,
        packetLossPercent: sql`excluded.packet_loss_percent`,
        source: sql`excluded.source`,
        resolvedAt: sql`excluded.resolved_at`,
        resolvedBy: sql`excluded.resolved_by`,
        createdAt: sql`excluded.created_at`,
      },
    });

  await db.execute(
    sql`select setval(pg_get_serial_sequence('network_events', 'id'), coalesce((select max(id) from network_events), 0) + 1, false)`,
  );

  return NETWORK_EVENTS_SEED.length;
}

/* Rodando sozinho (`npm run seed:network`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('eventos de rede', await seedNetwork(db));
    } finally {
      await close();
    }
  });
}
