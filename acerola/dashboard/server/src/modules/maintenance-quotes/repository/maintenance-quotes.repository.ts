import { Inject, Injectable } from '@nestjs/common';
import { type MaintenanceQuoteListQuery } from '@template/shared/schemas/maintenance-quote.schema';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  maintenanceQuotes,
  type MaintenanceQuoteInsert,
  type MaintenanceQuoteRow,
} from '../../../lib/db/schema/maintenance-quotes.schema';

export type MaintenanceQuotePage = { rows: MaintenanceQuoteRow[]; total: number };

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha. Quem pode o quê, o
 * que carimbar e o que fazer com o documento vive no service.
 */
@Injectable()
export class MaintenanceQuotesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: MaintenanceQuoteListQuery): Promise<MaintenanceQuotePage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(maintenanceQuotes)
          .where(where)
          /* Do mais recente para o mais antigo: quem abre a tela procura o orçamento que
             chegou esta semana, não o do ano passado. */
          .orderBy(desc(maintenanceQuotes.quotedOn), desc(maintenanceQuotes.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar orçamentos da Manutenção',
      ),
      runQuery(
        this.db.select({ total: count() }).from(maintenanceQuotes).where(where),
        'contar orçamentos da Manutenção',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<MaintenanceQuoteRow | null> {
    return runMaybe(
      this.db.select().from(maintenanceQuotes).where(eq(maintenanceQuotes.id, id)).limit(1),
      'ler orçamento da Manutenção',
    );
  }

  async insert(values: MaintenanceQuoteInsert): Promise<MaintenanceQuoteRow> {
    const [row] = await runQuery(
      this.db.insert(maintenanceQuotes).values(values).returning(),
      'guardar orçamento da Manutenção',
    );

    /* O `returning` sempre devolve a linha inserida; o tipo é que não sabe disso. */
    return row as MaintenanceQuoteRow;
  }

  async update(
    id: number,
    values: Partial<MaintenanceQuoteInsert>,
  ): Promise<MaintenanceQuoteRow | null> {
    const [row] = await runQuery(
      this.db.update(maintenanceQuotes).set(values).where(eq(maintenanceQuotes.id, id)).returning(),
      'alterar orçamento da Manutenção',
    );

    return row ?? null;
  }

  async remove(id: number): Promise<void> {
    await runQuery(
      this.db.delete(maintenanceQuotes).where(eq(maintenanceQuotes.id, id)),
      'excluir orçamento da Manutenção',
    );
  }
}

/** A busca procura na empresa e na descrição: é por uma das duas que alguém lembra dele. */
function buildWhere(query: MaintenanceQuoteListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.status) filters.push(eq(maintenanceQuotes.status, query.status));
  if (query.kind) filters.push(eq(maintenanceQuotes.kind, query.kind));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(ilike(maintenanceQuotes.supplier, term), ilike(maintenanceQuotes.description, term)),
    );
  }

  return filters.length > 0 ? and(...filters) : undefined;
}
