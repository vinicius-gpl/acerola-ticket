import { Inject, Injectable } from '@nestjs/common';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { parseTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { ticketStatusesOfGroup } from '@template/shared/domain/ticket-status.util';
import { type UserRole } from '@template/shared/schemas/user.schema';
import {
  type TicketListQuery,
  type TicketReportQuery,
} from '@template/shared/schemas/ticket.schema';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { computers } from '../../../lib/db/schema/computers.schema';
import { internalRoles } from '../../../lib/db/schema/internal-roles.schema';
import { ticketAreas, type TicketAreaInsert } from '../../../lib/db/schema/ticket-areas.schema';
import { tickets, type TicketInsert, type TicketRow } from '../../../lib/db/schema/tickets.schema';

/**
 * O chamado com o NOME da máquina junto.
 *
 * O nome sai do mesmo `select` por `left join`: buscá-lo depois, linha a linha, daria uma ida
 * ao banco por chamado na lista. `left`, e não `inner`, porque a maioria dos chamados não tem
 * máquina nenhuma — e um `inner` os faria sumir da tela.
 */
export type TicketWithComputer = TicketRow & { computerName: string | null };

export type TicketPage = {
  rows: TicketWithComputer[];
  total: number;
};

/**
 * As colunas do chamado mais o apelido da máquina.
 *
 * `coalesce`: a ficha mostra o apelido quando existe ("Recepção — balcão") e o nome da própria
 * máquina quando não ("RECEPCAO-01"). Decidir isso aqui evita que cada tela decida diferente.
 */
const ticketColumns = {
  ...getTableColumns(tickets),
  computerName: sql<string | null>`coalesce(${computers.displayName}, ${computers.name})`,
};

/** O recorte que os indicadores precisam — e só ele. */
export type TicketMetricsRow = {
  status: TicketRow['status'];
  createdAt: Date;
  resolvedAt: Date | null;
  problemType: TicketRow['problemType'];
  department: TicketRow['department'];
  area: TicketRow['area'];
};

/**
 * O repository não tem regra: ele traduz filtro em consulta e devolve linha. Toda decisão —
 * quem pode, o que carimbar, o que fazer quando não existe — vive no service.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 *
 * **Não há `delete` aqui, e a ausência é a regra.** Chamado não se apaga: o que sai da fila
 * sai por situação. Sem o método, nenhum service consegue apagar um por engano.
 */
@Injectable()
export class TicketsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * `areas` são as áreas que QUEM PEDIU enxerga (ver `TicketsService.resolveAreaAccess`) —
   * sem cargo em área nenhuma, lista vazia, e a consulta nem toca o banco: devolve página
   * vazia direto, sem gastar uma viagem para aprender o que já se sabia de antemão.
   */
  async list(query: TicketListQuery, areas: readonly TicketArea[]): Promise<TicketPage> {
    if (areas.length === 0) return { rows: [], total: 0 };

    const where = await this.scopedWhere(query, areas);

    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select(ticketColumns)
          .from(tickets)
          .leftJoin(computers, eq(computers.id, tickets.computerId))
          .where(where)
          .orderBy(desc(tickets.createdAt), desc(tickets.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar chamados',
      ),
      runQuery(this.db.select({ total: count() }).from(tickets).where(where), 'contar chamados'),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  /**
   * TODOS os chamados que casam com o filtro, sem página — é o que o relatório baixa. Os
   * MESMOS filtros da tela, e por isso reaproveita `buildWhere`; sem paginação de propósito,
   * porque o relatório existe justamente para levar o que a tela não mostra de uma vez.
   */
  async listAll(query: TicketReportQuery, areas: readonly TicketArea[]): Promise<TicketWithComputer[]> {
    if (areas.length === 0) return [];

    return runQuery(
      this.db
        .select(ticketColumns)
        .from(tickets)
        .leftJoin(computers, eq(computers.id, tickets.computerId))
        .where(await this.scopedWhere(query, areas))
        .orderBy(desc(tickets.createdAt), desc(tickets.id)),
      'listar chamados para o relatório',
    );
  }

  /**
   * O filtro da tela/relatório, SOMADO a duas travas de área:
   *
   *  1. **O que a pessoa enxerga** — as áreas em que ela tem cargo.
   *  2. **O CONTEXTO em que ela está** (#13), quando a consulta pede uma área.
   *
   * As duas usam a mesma régua (`areaReach`): o chamado é da área, ou a área foi somada a ele
   * como PARTICIPANTE. Sem a segunda parte, o chamado de Infraestrutura em que a Manutenção
   * foi chamada para ajudar não apareceria na fila de nenhuma das duas — some de Manutenção,
   * que não é a área original, e some de Infraestrutura para quem não tem cargo lá.
   */
  private async scopedWhere(query: TicketFilter, areas: readonly TicketArea[]): Promise<SQL | undefined> {
    const visibility = await this.areaReach(areas);
    const context = query.area ? await this.areaReach([query.area]) : undefined;

    return and(buildWhere(query), visibility, context);
  }

  /** "O chamado é desta área": a área original dele, ou uma das participantes. */
  private async areaReach(areas: readonly TicketArea[]): Promise<SQL | undefined> {
    const participantIds = await this.ticketIdsWithParticipantArea(areas);
    if (participantIds.length === 0) return inArray(tickets.area, areas);

    return or(inArray(tickets.area, areas), inArray(tickets.id, participantIds));
  }

  /** Os `id` de chamados que ganharam alguma destas áreas como PARTICIPANTE (não a original). */
  private async ticketIdsWithParticipantArea(areas: readonly TicketArea[]): Promise<number[]> {
    if (areas.length === 0) return [];

    const rows = await runQuery(
      this.db
        .selectDistinct({ ticketId: ticketAreas.ticketId })
        .from(ticketAreas)
        .where(inArray(ticketAreas.area, areas)),
      'listar chamados por área participante',
    );

    return rows.map((row) => row.ticketId);
  }

  async findById(id: number): Promise<TicketWithComputer | null> {
    return runMaybe(
      this.db
        .select(ticketColumns)
        .from(tickets)
        .leftJoin(computers, eq(computers.id, tickets.computerId))
        .where(eq(tickets.id, id))
        .limit(1),
      'ler chamado',
    );
  }

  /**
   * As colunas que os indicadores usam, de TODOS os chamados — sem paginação de propósito:
   * média e contagem calculadas só sobre a página visível responderiam outra pergunta que
   * não a que o painel faz.
   *
   * É um `select` estreito justamente por isso: a descrição e o print de cada chamado não
   * entram em cálculo nenhum, e trazê-los seria carregar o banco à toa.
   */
  async listForMetrics(areas: readonly TicketArea[]): Promise<TicketMetricsRow[]> {
    if (areas.length === 0) return [];

    /* A MESMA régua da fila (`areaReach`): os números de cima e a lista de baixo precisam
       contar o mesmo conjunto, ou o cartão diz "12 abertos" sobre uma lista de 9. */
    const reach = await this.areaReach(areas);

    return runQuery(
      this.db
        .select({
          status: tickets.status,
          createdAt: tickets.createdAt,
          resolvedAt: tickets.resolvedAt,
          problemType: tickets.problemType,
          department: tickets.department,
          area: tickets.area,
        })
        .from(tickets)
        .where(reach),
      'calcular indicadores de chamados',
    );
  }

  async insert(values: TicketInsert): Promise<TicketWithComputer> {
    const [row] = await runQuery(
      this.db.insert(tickets).values(values).returning(),
      'abrir chamado',
    );

    /* Chamado nasce sem máquina, então não há nome a buscar: o `left join` daria nulo de
       qualquer jeito, e uma consulta a mais no caminho de quem está pedindo socorro é a
       última coisa que se quer. */
    return { ...(row as TicketRow), computerName: null };
  }

  /**
   * Salva e devolve o chamado JÁ com o nome da máquina.
   *
   * O `returning` do `update` traz só as colunas da tabela — o nome mora na outra. Reler é uma
   * consulta a mais num caminho raro (alguém atendendo), e paga por não existir um segundo
   * formato de chamado circulando pelo sistema.
   */
  async update(id: number, values: Partial<TicketInsert>): Promise<TicketWithComputer> {
    const [row] = await runQuery(
      this.db.update(tickets).set(values).where(eq(tickets.id, id)).returning({ id: tickets.id }),
      'salvar chamado',
    );

    const saved = row ? await this.findById(row.id) : null;
    if (!saved) throw new Error('update returned no ticket row');

    return saved;
  }

  /**
   * O cargo da pessoa em CADA área, direto de `internal_roles` — sem o padrão `'user'` que
   * `roleInContext` aplicaria. A AUSÊNCIA de linha aqui É a resposta "sem acesso" (#13):
   * diferente do cargo interno (#11), chamado não tem cargo mínimo implícito.
   */
  async contextRolesFor(
    userId: string,
    userEmail: string | null,
  ): Promise<Partial<Record<TicketArea, UserRole>>> {
    const rows = await runQuery(
      this.db
        .select({ context: internalRoles.context, role: internalRoles.role })
        .from(internalRoles)
        .where(
          userEmail
            ? or(eq(internalRoles.userId, userId), eq(internalRoles.userEmail, userEmail))
            : eq(internalRoles.userId, userId),
        ),
      'ler cargos por área do chamado',
    );

    const byArea: Partial<Record<TicketArea, UserRole>> = {};
    for (const row of rows) byArea[row.context as TicketArea] = row.role as UserRole;

    return byArea;
  }

  /** As áreas PARTICIPANTES de um chamado — nunca inclui a área original (`tickets.area`). */
  async listAreasOf(ticketId: number): Promise<TicketArea[]> {
    const rows = await runQuery(
      this.db.select({ area: ticketAreas.area }).from(ticketAreas).where(eq(ticketAreas.ticketId, ticketId)),
      'listar áreas participantes do chamado',
    );

    return rows.map((row) => row.area as TicketArea);
  }

  /** As áreas participantes de VÁRIOS chamados de uma vez — para a lista não ir ao banco um a um. */
  async listAreasFor(ticketIds: readonly number[]): Promise<Map<number, TicketArea[]>> {
    const byTicket = new Map<number, TicketArea[]>();
    if (ticketIds.length === 0) return byTicket;

    const rows = await runQuery(
      this.db
        .select({ ticketId: ticketAreas.ticketId, area: ticketAreas.area })
        .from(ticketAreas)
        .where(inArray(ticketAreas.ticketId, ticketIds)),
      'listar áreas participantes dos chamados',
    );

    for (const row of rows) {
      const current = byTicket.get(row.ticketId) ?? [];
      current.push(row.area as TicketArea);
      byTicket.set(row.ticketId, current);
    }

    return byTicket;
  }

  /**
   * Soma uma área participante. `onConflictDoNothing`: somar uma área que já é participante
   * (ou que é a própria área original, coincidência inofensiva) não é erro — é o mesmo pedido
   * de novo, e o resultado final é o mesmo chamado com a mesma área participante.
   */
  async addArea(values: TicketAreaInsert): Promise<void> {
    await runQuery(
      this.db.insert(ticketAreas).values(values).onConflictDoNothing(),
      'somar área ao chamado',
    );
  }

  async removeArea(ticketId: number, area: TicketArea): Promise<void> {
    await runQuery(
      this.db.delete(ticketAreas).where(and(eq(ticketAreas.ticketId, ticketId), eq(ticketAreas.area, area))),
      'remover área do chamado',
    );
  }
}

/** Os filtros que a lista E o relatório têm em comum — nenhum dos dois usa página aqui. */
type TicketFilter = Pick<
  TicketListQuery,
  | 'search'
  | 'status'
  | 'statusGroup'
  | 'priority'
  | 'area'
  | 'department'
  | 'problemType'
  | 'computerId'
>;

/**
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres. Acento continua contando:
 * "impressora" e "impressôra" são diferentes — busca sem acento é trabalho para quando
 * alguém pedir.
 */
function buildWhere(query: TicketFilter): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.status) filters.push(eq(tickets.status, query.status));
  /* O grupo é o filtro dos cartões do topo: os estágios dele saem do domínio, do mesmo lugar
     de onde sai a contagem do cartão — é o que faz o número e a lista baterem. */
  if (query.statusGroup) {
    filters.push(inArray(tickets.status, [...ticketStatusesOfGroup(query.statusGroup)]));
  }
  if (query.priority) filters.push(eq(tickets.priority, query.priority));
  /* `area` NÃO entra aqui: ela é o contexto, e contexto inclui as áreas participantes —
     quem resolve é o `scopedWhere`, que sabe consultar o banco. */
  if (query.department) filters.push(eq(tickets.department, query.department));
  if (query.problemType) filters.push(eq(tickets.problemType, query.problemType));
  if (query.computerId) filters.push(eq(tickets.computerId, query.computerId));

  if (query.search) filters.push(searchFilter(query.search));

  return filters.length > 0 ? and(...filters) : undefined;
}

/**
 * A busca livre: nome de quem abriu, descrição, solução, responsável — e o protocolo.
 *
 * "CH-0007", "ch 7", "7" — a MESMA leitura lenta que `findByProtocol` já aceita (ver
 * `ticket-protocol.util`). Sem isto, procurar pelo protocolo que a pessoa anotou no papel
 * não achava nada: `protocol` não é coluna, é o `id` vestido de `CH-0007`.
 */
function searchFilter(search: string): SQL | undefined {
  const term = `%${search}%`;
  const protocolId = parseTicketProtocol(search);

  return or(
    ilike(tickets.requesterName, term),
    ilike(tickets.description, term),
    ilike(tickets.solution, term),
    ilike(tickets.assignee, term),
    ...(protocolId ? [eq(tickets.id, protocolId)] : []),
  );
}
