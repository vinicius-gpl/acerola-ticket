import { Inject, Injectable } from '@nestjs/common';
import {
  type MovementListQuery,
  type PartListQuery,
} from '@template/shared/schemas/part.schema';
import { and, asc, count, desc, eq, gt, ilike, or, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database, type DatabaseExecutor } from '../../../lib/db/db.type';
import { computers } from '../../../lib/db/schema/computers.schema';
import {
  partMovements,
  type PartMovementInsert,
  type PartMovementRow,
} from '../../../lib/db/schema/part-movements.schema';
import { parts, type PartInsert, type PartRow } from '../../../lib/db/schema/parts.schema';

export type PartPage = { rows: PartRow[]; total: number };

/** A movimentação com a peça e a máquina dela, do jeito que a tela precisa ler. */
export type MovementWithRefs = {
  movement: PartMovementRow;
  part: { id: number; name: string; condition: string } | null;
  computer: {
    id: number;
    name: string;
    displayName: string | null;
    department: string | null;
  } | null;
};

export type MovementPage = { rows: MovementWithRefs[]; total: number };

const partColumns = { id: parts.id, name: parts.name, condition: parts.condition };

const computerColumns = {
  id: computers.id,
  name: computers.name,
  displayName: computers.displayName,
  department: computers.department,
};

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha. Toda decisão — quem
 * pode, se a saída cabe no estoque, o que carimbar — vive no service.
 *
 * Os métodos de escrita recebem um `DatabaseExecutor`, e não usam `this.db` direto: é o que
 * permite ao service chamá-los DENTRO de uma transação. Uma movimentação e o saldo da peça
 * precisam entrar juntos ou não entrar — gravar um sem o outro deixaria a prateleira
 * discordando do próprio extrato.
 */
@Injectable()
export class PartsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: PartListQuery): Promise<PartPage> {
    const where = buildPartWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(parts)
          .where(where)
          /* Por categoria e depois por nome: quem abre o depósito procura "os SSDs", não a
             peça cadastrada mais recentemente. */
          .orderBy(asc(parts.category), asc(parts.name))
          .limit(query.pageSize)
          .offset(offset),
        'listar peças',
      ),
      runQuery(this.db.select({ total: count() }).from(parts).where(where), 'contar peças'),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number, executor: DatabaseExecutor = this.db): Promise<PartRow | null> {
    return runMaybe(executor.select().from(parts).where(eq(parts.id, id)).limit(1), 'ler peça');
  }

  /**
   * A peça, TRAVADA até o fim da transação.
   *
   * Sem o `for update`, duas saídas simultâneas leriam o mesmo saldo 1, as duas passariam na
   * conferência e o estoque terminaria em -1 — o clássico. Com a trava, a segunda espera a
   * primeira terminar e lê o saldo já atualizado.
   */
  async findByIdForUpdate(id: number, executor: DatabaseExecutor): Promise<PartRow | null> {
    return runMaybe(
      executor.select().from(parts).where(eq(parts.id, id)).limit(1).for('update'),
      'ler peça para movimentar',
    );
  }

  async insert(values: PartInsert, executor: DatabaseExecutor = this.db): Promise<PartRow> {
    const [row] = await runQuery(
      executor.insert(parts).values(values).returning(),
      'cadastrar peça',
    );

    return row as PartRow;
  }

  async update(
    id: number,
    values: Partial<PartInsert>,
    executor: DatabaseExecutor = this.db,
  ): Promise<PartRow> {
    const [row] = await runQuery(
      executor.update(parts).set(values).where(eq(parts.id, id)).returning(),
      'salvar peça',
    );

    return row as PartRow;
  }

  async listMovements(query: MovementListQuery): Promise<MovementPage> {
    const where = buildMovementWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select({ movement: partMovements, part: partColumns, computer: computerColumns })
          .from(partMovements)
          .leftJoin(parts, eq(partMovements.partId, parts.id))
          .leftJoin(computers, eq(partMovements.computerId, computers.id))
          .where(where)
          .orderBy(desc(partMovements.createdAt), desc(partMovements.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar movimentações',
      ),
      runQuery(
        this.db
          .select({ total: count() })
          .from(partMovements)
          .leftJoin(parts, eq(partMovements.partId, parts.id))
          .leftJoin(computers, eq(partMovements.computerId, computers.id))
          .where(where),
        'contar movimentações',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findMovementById(
    id: number,
    executor: DatabaseExecutor = this.db,
  ): Promise<MovementWithRefs | null> {
    return runMaybe(
      executor
        .select({ movement: partMovements, part: partColumns, computer: computerColumns })
        .from(partMovements)
        .leftJoin(parts, eq(partMovements.partId, parts.id))
        .leftJoin(computers, eq(partMovements.computerId, computers.id))
        .where(eq(partMovements.id, id))
        .limit(1),
      'ler movimentação',
    );
  }

  async insertMovement(values: PartMovementInsert, executor: DatabaseExecutor): Promise<number> {
    const [row] = await runQuery(
      executor.insert(partMovements).values(values).returning({ id: partMovements.id }),
      'registrar movimentação',
    );

    return (row as { id: number }).id;
  }

  async updateMovement(
    id: number,
    values: Partial<PartMovementInsert>,
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    await runQuery(
      executor.update(partMovements).set(values).where(eq(partMovements.id, id)),
      'salvar movimentação',
    );
  }

  async deleteMovement(id: number, executor: DatabaseExecutor): Promise<void> {
    await runQuery(
      executor.delete(partMovements).where(eq(partMovements.id, id)),
      'excluir movimentação',
    );
  }

  /** O extrato de uma peça em ordem cronológica — é assim que o saldo é refeito. */
  async listMovementsOfPart(
    partId: number,
    executor: DatabaseExecutor,
  ): Promise<PartMovementRow[]> {
    return runQuery(
      executor
        .select()
        .from(partMovements)
        .where(eq(partMovements.partId, partId))
        .orderBy(asc(partMovements.createdAt), asc(partMovements.id)),
      'ler o extrato da peça',
    );
  }

  /** Abre a transação. Movimentação e saldo entram juntos, ou não entram. */
  async transaction<T>(run: (executor: DatabaseExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => run(tx));
  }
}

/**
 * A busca cobre o que a pessoa lembra: a descrição da peça.
 *
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres. Acento continua contando:
 * busca sem acento é trabalho para quando alguém pedir.
 */
function buildPartWhere(query: PartListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.category) filters.push(eq(parts.category, query.category));
  if (query.condition) filters.push(eq(parts.condition, query.condition));
  if (query.inStockOnly) filters.push(gt(parts.balance, 0));

  const search = query.search?.trim();
  if (search) filters.push(or(ilike(parts.name, `%${search}%`)));

  return and(...filters.filter((filter): filter is SQL => filter !== undefined));
}

function buildMovementWhere(query: MovementListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.partId) filters.push(eq(partMovements.partId, query.partId));
  if (query.computerId) filters.push(eq(partMovements.computerId, query.computerId));
  if (query.type) filters.push(eq(partMovements.type, query.type));

  return and(...filters.filter((filter): filter is SQL => filter !== undefined));
}
