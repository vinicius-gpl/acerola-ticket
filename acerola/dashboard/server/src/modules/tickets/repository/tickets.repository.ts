import { Inject, Injectable } from '@nestjs/common';
import {
  type TicketListQuery,
  type TicketReportQuery,
} from '@template/shared/schemas/ticket.schema';
import { and, count, desc, eq, getTableColumns, ilike, or, sql, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { computers } from '../../../lib/db/schema/computers.schema';
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

  async list(query: TicketListQuery): Promise<TicketPage> {
    const where = buildWhere(query);
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
  async listAll(query: TicketReportQuery): Promise<TicketWithComputer[]> {
    return runQuery(
      this.db
        .select(ticketColumns)
        .from(tickets)
        .leftJoin(computers, eq(computers.id, tickets.computerId))
        .where(buildWhere(query))
        .orderBy(desc(tickets.createdAt), desc(tickets.id)),
      'listar chamados para o relatório',
    );
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
  async listForMetrics(): Promise<TicketMetricsRow[]> {
    return runQuery(
      this.db
        .select({
          status: tickets.status,
          createdAt: tickets.createdAt,
          resolvedAt: tickets.resolvedAt,
          problemType: tickets.problemType,
          department: tickets.department,
        })
        .from(tickets),
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
}

/** Os filtros que a lista E o relatório têm em comum — nenhum dos dois usa página aqui. */
type TicketFilter = Pick<
  TicketListQuery,
  'search' | 'status' | 'priority' | 'department' | 'problemType' | 'computerId'
>;

/**
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres. Acento continua contando:
 * "impressora" e "impressôra" são diferentes — busca sem acento é trabalho para quando
 * alguém pedir.
 */
function buildWhere(query: TicketFilter): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.status) filters.push(eq(tickets.status, query.status));
  if (query.priority) filters.push(eq(tickets.priority, query.priority));
  if (query.department) filters.push(eq(tickets.department, query.department));
  if (query.problemType) filters.push(eq(tickets.problemType, query.problemType));
  if (query.computerId) filters.push(eq(tickets.computerId, query.computerId));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        ilike(tickets.requesterName, term),
        ilike(tickets.description, term),
        ilike(tickets.solution, term),
        ilike(tickets.assignee, term),
      ),
    );
  }

  return filters.length > 0 ? and(...filters) : undefined;
}
