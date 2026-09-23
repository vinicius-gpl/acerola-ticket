import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { computerAlerts } from '../../../server/src/lib/db/schema/computer-alerts.schema';
import { computerSamples } from '../../../server/src/lib/db/schema/computer-samples.schema';
import { computers } from '../../../server/src/lib/db/schema/computers.schema';
import { openSeedDatabase, report } from '../seed.util';
import {
  COMPUTERS_SEED,
  COMPUTER_ALERTS_SEED,
  COMPUTER_SAMPLES_SEED,
} from './computers.data';

/**
 * Grava o inventário de teste: as máquinas, a série de uso e os alertas.
 *
 * A ORDEM É DEPENDÊNCIA, não preferência: amostra e alerta apontam para a máquina, e o
 * Postgres recusa a linha se ela ainda não existir.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas — quem arquivou uma máquina de teste na tela a vê voltar ao
 * original, que é exatamente o que "rodar o seed" promete.
 */
export async function seedComputers(db: Database): Promise<number> {
  await db
    .insert(computers)
    .values(COMPUTERS_SEED)
    .onConflictDoUpdate({
      target: computers.id,
      set: {
        name: sql`excluded.name`,
        displayName: sql`excluded.display_name`,
        responsibleName: sql`excluded.responsible_name`,
        department: sql`excluded.department`,
        tokenHash: sql`excluded.token_hash`,
        os: sql`excluded.os`,
        platform: sql`excluded.platform`,
        platformVersion: sql`excluded.platform_version`,
        kernelVersion: sql`excluded.kernel_version`,
        arch: sql`excluded.arch`,
        cpuModel: sql`excluded.cpu_model`,
        logicalCpus: sql`excluded.logical_cpus`,
        physicalCpus: sql`excluded.physical_cpus`,
        totalMemoryBytes: sql`excluded.total_memory_bytes`,
        macAddress: sql`excluded.mac_address`,
        localIp: sql`excluded.local_ip`,
        totalDiskBytes: sql`excluded.total_disk_bytes`,
        freeDiskBytes: sql`excluded.free_disk_bytes`,
        uptimeSeconds: sql`excluded.uptime_seconds`,
        bootTime: sql`excluded.boot_time`,
        healthScore: sql`excluded.health_score`,
        healthStatus: sql`excluded.health_status`,
        warnings: sql`excluded.warnings`,
        lastSeenAt: sql`excluded.last_seen_at`,
        agentVersion: sql`excluded.agent_version`,
        isArchived: sql`excluded.is_archived`,
        isBlocked: sql`excluded.is_blocked`,
        blockReason: sql`excluded.block_reason`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await seedSamples(db);
  await seedAlerts(db);
  await syncIdSequences(db);

  return COMPUTERS_SEED.length;
}

/**
 * As amostras entram em blocos.
 *
 * São quase 1.200 linhas, e um único `insert` com tudo junto estoura o limite de parâmetros
 * de uma instrução do Postgres — a falha apareceria só na máquina de quem rodasse o seed com
 * a série inteira, que é o pior lugar para descobrir.
 */
const SAMPLE_CHUNK_SIZE = 500;

async function seedSamples(db: Database): Promise<void> {
  for (let start = 0; start < COMPUTER_SAMPLES_SEED.length; start += SAMPLE_CHUNK_SIZE) {
    const chunk = COMPUTER_SAMPLES_SEED.slice(start, start + SAMPLE_CHUNK_SIZE);

    await db
      .insert(computerSamples)
      .values(chunk)
      .onConflictDoUpdate({
        target: computerSamples.id,
        set: {
          computerId: sql`excluded.computer_id`,
          sampledAt: sql`excluded.sampled_at`,
          cpuPercent: sql`excluded.cpu_percent`,
          memoryPercent: sql`excluded.memory_percent`,
          diskPercent: sql`excluded.disk_percent`,
          networkBytesPerSec: sql`excluded.network_bytes_per_sec`,
        },
      });
  }
}

async function seedAlerts(db: Database): Promise<void> {
  await db
    .insert(computerAlerts)
    .values(COMPUTER_ALERTS_SEED)
    .onConflictDoUpdate({
      target: computerAlerts.id,
      set: {
        computerId: sql`excluded.computer_id`,
        metric: sql`excluded.metric`,
        peakValue: sql`excluded.peak_value`,
        threshold: sql`excluded.threshold`,
        status: sql`excluded.status`,
        startedAt: sql`excluded.started_at`,
        recoveredAt: sql`excluded.recovered_at`,
        causeProcess: sql`excluded.cause_process`,
        createdAt: sql`excluded.created_at`,
      },
    });
}

/**
 * Empurra os contadores de `id` para depois da última linha gravada.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres. Sem isto, a primeira máquina
 * cadastrada pela tela pediria o id 1 — que já existe — e a pessoa levaria um erro logo no
 * cadastro, sem ter feito nada de errado.
 */
async function syncIdSequences(db: Database): Promise<void> {
  const tables = [
    ['computers', 'id'],
    ['computer_samples', 'id'],
    ['computer_alerts', 'id'],
  ] as const;

  for (const [table, column] of tables) {
    await db.execute(
      sql`select setval(pg_get_serial_sequence(${table}, ${column}), coalesce((select max(id) from ${sql.identifier(table)}), 0) + 1, false)`,
    );
  }
}

/* Rodando sozinho (`npm run seed:computers`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('computadores', await seedComputers(db));
    } finally {
      await close();
    }
  });
}
