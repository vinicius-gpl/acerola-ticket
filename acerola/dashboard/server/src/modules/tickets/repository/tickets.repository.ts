import { Inject, Injectable } from '@nestjs/common';
import { type TicketListQuery } from '@template/shared/schemas/ticket.schema';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { tickets, type TicketInsert, type TicketRow } from '../../../lib/db/schema/tickets.schema';

export type TicketPage = {
  rows: TicketRow[];
  total: number;
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
          .select()
          .from(tickets)
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

  async findById(id: number): Promise<TicketRow | null> {
    return runMaybe(
      this.db.select().from(tickets).where(eq(tickets.id, id)).limit(1),
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

  async insert(values: TicketInsert): Promise<TicketRow> {
    const [row] = await runQuery(
      this.db.insert(tickets).values(values).returning(),
      'abrir chamado',
    );

    return row as TicketRow;
  }

  async update(id: number, values: Partial<TicketInsert>): Promise<TicketRow> {
    const [row] = await runQuery(
      this.db.update(tickets).set(values).where(eq(tickets.id, id)).returning(),
      'salvar chamado',
    );

    return row as TicketRow;
  }
}

/**
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres. Acento continua contando:
 * "impressora" e "impressôra" são diferentes — busca sem acento é trabalho para quando
 * alguém pedir.
 */
function buildWhere(query: TicketListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.status) filters.push(eq(tickets.status, query.status));
  if (query.priority) filters.push(eq(tickets.priority, query.priority));
  if (query.department) filters.push(eq(tickets.department, query.department));
  if (query.problemType) filters.push(eq(tickets.problemType, query.problemType));

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
