import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { asDate, asTimestamp } from '../../../lib/db/sql-timestamp.util';
import { qualified } from '../../../lib/db/sql-column.util';
import { computerAlerts } from '../../../lib/db/schema/computer-alerts.schema';
import { computers } from '../../../lib/db/schema/computers.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import { parts } from '../../../lib/db/schema/parts.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

export type StatusCount = { key: string; count: number };

export type RecurringPersonRow = {
  requesterName: string;
  department: string | null;
  problemType: string;
  count: number;
};

export type RecurringMachineRow = {
  computerId: number;
  computerName: string;
  problemType: string;
  count: number;
};

export type HeavyMaintenanceRow = {
  computerId: number;
  computerName: string;
  maintenanceCount: number;
};

export type PeakingRow = {
  computerId: number;
  computerName: string;
  today: number;
  month: number;
  topMetric: string | null;
};

export type MaintenanceLogRow = {
  id: number;
  computerName: string;
  type: string;
  description: string | null;
  performedBy: string | null;
  performedAt: Date;
};

export type PlanCandidateRow = {
  computerId: number;
  computerName: string;
  department: string | null;
  lastDoneAt: Date | null;
};

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
          openedInPeriod: sql<number>`count(*) filter (where ${tickets.createdAt} >= ${asTimestamp(since)})::int`,
          resolvedInPeriod: sql<number>`count(*) filter (where ${tickets.resolvedAt} >= ${asTimestamp(since)})::int`,
          averageResolutionHours: sql<number | null>`
            avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600)
              filter (where ${tickets.resolvedAt} >= ${asTimestamp(since)})
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
            where ${qualified(computerAlerts.computerId)} = ${qualified(computers.id)}
              and ${qualified(computerAlerts.status)} = 'active'
          )`,
          maintenanceCount: sql<number>`(
            select count(*)::int from ${maintenances}
            where ${qualified(maintenances.computerId)} = ${qualified(computers.id)}
          )`,
        })
        .from(computers)
        .where(eq(computers.isArchived, false)),
      'ler as máquinas com problema',
    );
  }

  /**
   * RECORRÊNCIA por pessoa: a mesma pessoa abrindo o mesmo tipo de problema.
   *
   * O `having` filtra depois de agrupar, que é a única forma de dizer "só os grupos com três
   * ou mais". Fazer isso em memória traria todos os chamados do mês para o servidor só para
   * jogar a maioria fora.
   */
  async recurringByPerson(since: Date, threshold: number): Promise<RecurringPersonRow[]> {
    return runQuery(
      this.db
        .select({
          requesterName: tickets.requesterName,
          department: tickets.department,
          problemType: tickets.problemType,
          count: count(),
        })
        .from(tickets)
        .where(gte(tickets.createdAt, since))
        .groupBy(tickets.requesterName, tickets.department, tickets.problemType)
        .having(gte(count(), threshold))
        .orderBy(desc(count())),
      'procurar problemas que se repetem',
    );
  }

  /** O mesmo, por MÁQUINA — o que o sistema antigo não conseguia ver. */
  async recurringByMachine(since: Date, threshold: number): Promise<RecurringMachineRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          problemType: tickets.problemType,
          count: count(),
        })
        .from(tickets)
        .innerJoin(computers, eq(computers.id, tickets.computerId))
        .where(gte(tickets.createdAt, since))
        .groupBy(computers.id, computers.displayName, computers.name, tickets.problemType)
        .having(gte(count(), threshold))
        .orderBy(desc(count())),
      'procurar máquinas que repetem problema',
    );
  }

  /** Máquinas que já consumiram manutenção demais — candidatas a troca. */
  async heavyMaintenance(threshold: number): Promise<HeavyMaintenanceRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          maintenanceCount: count(),
        })
        .from(maintenances)
        .innerJoin(computers, eq(computers.id, maintenances.computerId))
        .groupBy(computers.id, computers.displayName, computers.name)
        .having(gte(count(), threshold))
        .orderBy(desc(count())),
      'procurar máquinas com muita manutenção',
    );
  }

  /**
   * Máquinas batendo no teto: episódios de alerta no mês, e quantos foram hoje.
   *
   * As duas contas saem do MESMO agrupamento (`filter`), e não de duas consultas: a tela
   * alterna entre Hoje e No mês com um clique, e buscar de novo a cada clique seria ida ao
   * banco para trocar de aba.
   */
  async peakingMachines(since: Date): Promise<PeakingRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          month: count(),
          today: sql<number>`count(*) filter (
            where ${qualified(computerAlerts.startedAt)} >= date_trunc('day', now())
          )::int`,
          topMetric: sql<string | null>`mode() within group (order by ${qualified(computerAlerts.metric)})`,
        })
        .from(computerAlerts)
        .innerJoin(computers, eq(computers.id, computerAlerts.computerId))
        .where(gte(computerAlerts.startedAt, since))
        .groupBy(computers.id, computers.displayName, computers.name)
        .orderBy(desc(count())),
      'procurar máquinas com picos',
    );
  }

  /**
   * As manutenções do mês, com a máquina — a lista do "o que foi feito".
   *
   * Vem o MÊS inteiro, e quem reparte em dia/semana/mês é o serviço: são poucas por mês, e
   * três consultas para três recortes do mesmo dado seria trabalho repetido.
   */
  async maintenanceLog(since: Date): Promise<MaintenanceLogRow[]> {
    return runQuery(
      this.db
        .select({
          id: maintenances.id,
          computerName: sql<string>`coalesce(
            ${computers.displayName}, ${computers.name}, ${maintenances.otherMachine}, 'Sem identificação'
          )`,
          type: maintenances.type,
          description: maintenances.description,
          performedBy: maintenances.performedBy,
          performedAt: maintenances.performedAt,
        })
        .from(maintenances)
        .leftJoin(computers, eq(computers.id, maintenances.computerId))
        .where(gte(maintenances.performedAt, since))
        .orderBy(desc(maintenances.performedAt)),
      'listar as manutenções do período',
    );
  }

  /** As máquinas em uso e quando cada uma foi aberta pela última vez — a base do plano. */
  async planCandidates(): Promise<PlanCandidateRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          department: computers.department,
          lastDoneAt: asDate(
            sql<Date | null>`max(${maintenances.performedAt}) filter (
              where ${maintenances.type} in ('preventive', 'corrective')
            )`,
            maintenances.performedAt,
          ),
        })
        .from(computers)
        .leftJoin(maintenances, eq(maintenances.computerId, computers.id))
        .where(and(eq(computers.isArchived, false), isNull(computers.disposedAt)))
        .groupBy(computers.id, computers.displayName, computers.name, computers.department),
      'montar o plano de preventiva',
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
          lastDoneAt: asDate(
            sql<Date | null>`max(${maintenances.performedAt}) filter (where ${maintenances.type} in ('preventive', 'corrective'))`,
            maintenances.performedAt,
          ),
        })
        .from(computers)
        .leftJoin(maintenances, eq(maintenances.computerId, computers.id))
        .where(eq(computers.isArchived, false))
        .groupBy(computers.id),
      'conferir as preventivas',
    );
  }
}
