import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { computerAlerts } from '../../../lib/db/schema/computer-alerts.schema';
import { computers } from '../../../lib/db/schema/computers.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import { parts } from '../../../lib/db/schema/parts.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

export type StatusCount = { key: string; count: number };

type TicketCountsRow = {
  open: number;
  inProgress: number;
  openedInPeriod: number;
  resolvedInPeriod: number;
  averageResolutionHours: number | null;
};

/**
 * A linha do banco virando números.
 *
 * Separado do método porque cada `??` conta como decisão, e a consulta passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 *
 * O Postgres devolve `numeric` como TEXTO; sem o `Number` a média chegaria à tela como string
 * e a formatação quebraria.
 */
const NO_TICKETS: TicketCounts = {
  open: 0,
  inProgress: 0,
  openedInPeriod: 0,
  resolvedInPeriod: 0,
  averageResolutionHours: null,
};

function toTicketCounts(row: TicketCountsRow | undefined): TicketCounts {
  /* Tabela vazia: o Postgres devolve uma linha de zeros, mas a ausência de linha também é
     possível — e zerado é a resposta certa para os dois casos. */
  if (!row) return NO_TICKETS;

  return { ...row, averageResolutionHours: toAverage(row.averageResolutionHours) };
}

/** Nulo continua nulo: zero diria que tudo foi resolvido instantaneamente. */
function toAverage(value: number | null): number | null {
  return value === null ? null : Number(value);
}

export type MachineRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
  healthScore: number;
  healthStatus: 'good' | 'attention' | 'critical';
  activeAlerts: number;
  maintenanceCount: number;
};

export type TicketCounts = {
  open: number;
  inProgress: number;
  openedInPeriod: number;
  resolvedInPeriod: number;
  averageResolutionHours: number | null;
};

/**
 * As contas do painel, direto das tabelas.
 *
 * Este repository só LÊ, e lê de quatro features diferentes. Não é quebra da regra de "um
 * caminho de escrita por dado": ela vale para escrita, e aqui não há nenhuma. O painel
 * precisa cruzar chamados com máquinas, manutenção e depósito, e fazer isso chamando quatro
 * services traria quatro listas inteiras para a memória do servidor só para contá-las.
 *
 * Toda consulta passa por `runQuery`: é o que faz a recusa do banco chegar à tela com status
 * e motivo, em vez de "erro inesperado".
 */
@Injectable()
export class DashboardRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Quantas máquinas em cada situação de saúde — arquivadas de fora. */
  async healthCounts(): Promise<StatusCount[]> {
    return runQuery(
      this.db
        .select({ key: computers.healthStatus, count: count() })
        .from(computers)
        .where(eq(computers.isArchived, false))
        .groupBy(computers.healthStatus),
      'contar a saúde do parque',
    );
  }

  /** Cadastradas cujo agente nunca conectou: falta instalar o agente nelas. */
  async neverSeenCount(): Promise<number> {
    const [row] = await runQuery(
      this.db
        .select({ total: count() })
        .from(computers)
        .where(and(eq(computers.isArchived, false), isNull(computers.lastSeenAt))),
      'contar as máquinas sem agente',
    );

    return row?.total ?? 0;
  }

  /**
   * Os números dos chamados, em uma consulta só.
   *
   * `filter (where ...)` é o agregado condicional do Postgres: conta a mesma tabela de
   * formas diferentes sem varrê-la quatro vezes. A média sai em HORAS, e só dos que foram
   * resolvidos DENTRO do período — média sobre o histórico inteiro não responde "como está
   * indo o atendimento este mês".
   */
  async ticketCounts(since: Date): Promise<TicketCounts> {
    const [row] = await runQuery(
      this.db
        .select({
          open: sql<number>`count(*) filter (where ${tickets.status} = 'open')::int`,
          inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')::int`,
          openedInPeriod: sql<number>`count(*) filter (where ${tickets.createdAt} >= ${since})::int`,
          resolvedInPeriod: sql<number>`count(*) filter (where ${tickets.resolvedAt} >= ${since})::int`,
          averageResolutionHours: sql<number | null>`
            avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600)
              filter (where ${tickets.resolvedAt} >= ${since})
          `,
        })
        .from(tickets),
      'contar os chamados do período',
    );

    return toTicketCounts(row);
  }

  /** Os tipos de problema mais abertos no período, do maior para o menor. */
  async ticketsByProblemType(since: Date, limit: number): Promise<StatusCount[]> {
    return runQuery(
      this.db
        .select({ key: tickets.problemType, count: count() })
        .from(tickets)
        .where(gte(tickets.createdAt, since))
        .groupBy(tickets.problemType)
        .orderBy(desc(count()))
        .limit(limit),
      'contar os tipos de problema',
    );
  }

  /** Os departamentos que mais pediram socorro no período. */
  async ticketsByDepartment(since: Date, limit: number): Promise<StatusCount[]> {
    return runQuery(
      this.db
        .select({ key: tickets.department, count: count() })
        .from(tickets)
        .where(gte(tickets.createdAt, since))
        .groupBy(tickets.department)
        .orderBy(desc(count()))
        .limit(limit),
      'contar os departamentos',
    );
  }

  async maintenancesInPeriod(since: Date): Promise<number> {
    const [row] = await runQuery(
      this.db
        .select({ total: count() })
        .from(maintenances)
        .where(gte(maintenances.performedAt, since)),
      'contar as manutenções do período',
    );

    return row?.total ?? 0;
  }

  /** O depósito em três números: tipos de peça, peças na prateleira e peças zeradas. */
  async partsSummary(): Promise<{ kinds: number; items: number; outOfStock: number }> {
    const [row] = await runQuery(
      this.db
        .select({
          kinds: count(),
          items: sql<number>`coalesce(sum(${parts.balance}), 0)::int`,
          outOfStock: sql<number>`count(*) filter (where ${parts.balance} = 0)::int`,
        })
        .from(parts),
      'resumir o depósito',
    );

    return { kinds: row?.kinds ?? 0, items: row?.items ?? 0, outOfStock: row?.outOfStock ?? 0 };
  }

  /**
   * As máquinas em uso com o que se sabe de ruim sobre cada uma.
   *
   * Alerta ABERTO e contagem de manutenção vêm por subconsulta, e não por `join`: com dois
   * `join` na mesma linha, cada alerta multiplicaria cada manutenção e as duas contagens
   * sairiam infladas — o erro clássico de somar duas listas de uma vez.
   */
  async machinesWithProblems(): Promise<MachineRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: computers.name,
          computerDisplayName: computers.displayName,
          department: computers.department,
          healthScore: computers.healthScore,
          healthStatus: computers.healthStatus,
          activeAlerts: sql<number>`(
            select count(*)::int from ${computerAlerts}
            where ${computerAlerts.computerId} = ${computers.id}
              and ${computerAlerts.status} = 'active'
          )`,
          maintenanceCount: sql<number>`(
            select count(*)::int from ${maintenances}
            where ${maintenances.computerId} = ${computers.id}
          )`,
        })
        .from(computers)
        .where(eq(computers.isArchived, false)),
      'ler as máquinas com problema',
    );
  }

  /**
   * Quando cada máquina em uso foi aberta pela última vez (preventiva ou corretiva).
   *
   * É a mesma régua da tela de Manutenção; aqui ela só vira um NÚMERO — quantas passaram do
   * prazo. Repetir a consulta em vez de chamar o service de lá mantém o painel com uma ida
   * só ao banco por pergunta.
   */
  async lastPreventiveByMachine(): Promise<{ lastDoneAt: Date | null }[]> {
    return runQuery(
      this.db
        .select({
          lastDoneAt: sql<Date | null>`max(${maintenances.performedAt}) filter (where ${maintenances.type} in ('preventive', 'corrective'))`,
        })
        .from(computers)
        .leftJoin(maintenances, eq(maintenances.computerId, computers.id))
        .where(eq(computers.isArchived, false))
        .groupBy(computers.id),
      'conferir as preventivas',
    );
  }
}
