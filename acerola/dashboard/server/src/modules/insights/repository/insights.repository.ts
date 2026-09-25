import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { computerAlerts } from '../../../lib/db/schema/computer-alerts.schema';
import { computerSamples } from '../../../lib/db/schema/computer-samples.schema';
import { computers } from '../../../lib/db/schema/computers.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';

/** As colunas que identificam a máquina em toda lista desta tela. */
const machineColumns = {
  computerId: computers.id,
  computerName: computers.name,
  computerDisplayName: computers.displayName,
  department: computers.department,
};

export type UsageRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  sampleCount: number;
  activeAlerts: number;
};

export type HardwareRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
  healthScore: number;
  healthStatus: 'good' | 'attention' | 'critical';
  totalMemoryBytes: number | null;
  totalDiskBytes: number | null;
  freeDiskBytes: number | null;
  cpuModel: string | null;
  lastSeenAt: Date | null;
};

export type TroubleRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
  maintenanceCount: number;
  alertCount: number;
  lastMaintenanceAt: Date | null;
};

/**
 * As contas da Inteligência, direto das tabelas.
 *
 * Só leitura, cruzando inventário, telemetria, alertas e manutenção. Assim como no painel,
 * fazer isso chamando os services de cada feature traria listas inteiras para a memória do
 * servidor só para agregá-las.
 *
 * Máquina DESCARTADA fica de fora de tudo aqui: recomendar upgrade para um computador que
 * saiu de uso é gastar a atenção de quem lê.
 */
@Injectable()
export class InsightsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** O uso MÉDIO de cada máquina no período, com os alertas abertos dela. */
  async usage(since: Date): Promise<UsageRow[]> {
    return runQuery(
      this.db
        .select({
          ...machineColumns,
          averageCpuPercent: sql<number | null>`avg(${computerSamples.cpuPercent})`,
          averageMemoryPercent: sql<number | null>`avg(${computerSamples.memoryPercent})`,
          sampleCount: sql<number>`count(${computerSamples.id})::int`,
          activeAlerts: sql<number>`(
            select count(*)::int from ${computerAlerts}
            where ${computerAlerts.computerId} = ${computers.id}
              and ${computerAlerts.status} = 'active'
          )`,
        })
        .from(computers)
        .leftJoin(
          computerSamples,
          and(
            eq(computerSamples.computerId, computers.id),
            gte(computerSamples.sampledAt, since),
          ),
        )
        .where(and(eq(computers.isArchived, false), isNull(computers.disposedAt)))
        .groupBy(computers.id),
      'ler o uso das máquinas',
    );
  }

  /** O hardware de cada máquina em uso — a base das recomendações de upgrade e da reserva. */
  async hardware(): Promise<HardwareRow[]> {
    return runQuery(
      this.db
        .select({
          ...machineColumns,
          healthScore: computers.healthScore,
          healthStatus: computers.healthStatus,
          totalMemoryBytes: computers.totalMemoryBytes,
          totalDiskBytes: computers.totalDiskBytes,
          freeDiskBytes: computers.freeDiskBytes,
          cpuModel: computers.cpuModel,
          lastSeenAt: computers.lastSeenAt,
        })
        .from(computers)
        .where(and(eq(computers.isArchived, false), isNull(computers.disposedAt))),
      'ler o hardware do parque',
    );
  }

  /**
   * Quanto trabalho cada máquina deu.
   *
   * As duas contagens saem por SUBCONSULTA, e não por `join`: com dois `join` na mesma linha,
   * cada alerta multiplicaria cada manutenção e os dois números sairiam inflados.
   */
  async trouble(since: Date): Promise<TroubleRow[]> {
    return runQuery(
      this.db
        .select({
          ...machineColumns,
          maintenanceCount: sql<number>`(
            select count(*)::int from ${maintenances}
            where ${maintenances.computerId} = ${computers.id}
          )`,
          alertCount: sql<number>`(
            select count(*)::int from ${computerAlerts}
            where ${computerAlerts.computerId} = ${computers.id}
              and ${computerAlerts.startedAt} >= ${since}
          )`,
          lastMaintenanceAt: sql<Date | null>`(
            select max(${maintenances.performedAt}) from ${maintenances}
            where ${maintenances.computerId} = ${computers.id}
          )`,
        })
        .from(computers)
        .where(and(eq(computers.isArchived, false), isNull(computers.disposedAt))),
      'ler o histórico de trabalho das máquinas',
    );
  }
}
