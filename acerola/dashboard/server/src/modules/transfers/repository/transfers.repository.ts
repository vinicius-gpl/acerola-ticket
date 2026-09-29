import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database, type DatabaseExecutor } from '../../../lib/db/db.type';
import {
  computerTransfers,
  type ComputerTransferInsert,
  type ComputerTransferRow,
} from '../../../lib/db/schema/computer-transfers.schema';
import { computers, type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { partMovements } from '../../../lib/db/schema/part-movements.schema';
import { parts } from '../../../lib/db/schema/parts.schema';

export type InstalledPartRow = {
  partId: number;
  name: string;
  category: string;
  quantity: number;
};

/**
 * As consultas da transferência.
 *
 * A escrita do depósito NÃO está aqui: ela mora no `PartsRepository`, que é dono do extrato e
 * do saldo. Duplicar a conta do saldo num segundo lugar é como as duas versões da mesma regra
 * começam a discordar.
 */
@Injectable()
export class TransfersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByComputer(computerId: number): Promise<ComputerTransferRow[]> {
    return runQuery(
      this.db
        .select()
        .from(computerTransfers)
        .where(eq(computerTransfers.computerId, computerId))
        .orderBy(desc(computerTransfers.createdAt)),
      'ler o histórico de transferências',
    );
  }

  /**
   * A máquina, travada até o fim da transação.
   *
   * Sem a trava, duas pessoas transferindo a mesma máquina ao mesmo tempo leriam o mesmo
   * departamento de origem, e o histórico registraria duas saídas do mesmo lugar.
   */
  async findComputerForUpdate(
    id: number,
    executor: DatabaseExecutor,
  ): Promise<ComputerRow | null> {
    return runMaybe(
      executor.select().from(computers).where(eq(computers.id, id)).limit(1).for('update'),
      'ler a máquina para transferir',
    );
  }

  async findComputer(id: number): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.id, id)).limit(1),
      'ler a máquina',
    );
  }

  /**
   * As peças que estão NA MÁQUINA hoje: o que saiu do depósito para ela e não voltou.
   *
   * A conta é `saída − entrada` por peça, e não o saldo da peça: o depósito guarda quanto
   * existe na prateleira, e esta pergunta é outra — quanto está na mesa de alguém. Saldo zero
   * ou negativo fica de fora, senão a tela ofereceria mover um teclado que já voltou.
   */
  async installedParts(computerId: number): Promise<InstalledPartRow[]> {
    const installed = sql<number>`sum(
      case when ${partMovements.type} = 'out' then ${partMovements.quantity}
           else -${partMovements.quantity} end
    )::int`;

    return runQuery(
      this.db
        .select({
          partId: parts.id,
          name: parts.name,
          category: parts.category,
          quantity: installed,
        })
        .from(partMovements)
        .innerJoin(parts, eq(parts.id, partMovements.partId))
        .where(eq(partMovements.computerId, computerId))
        .groupBy(parts.id, parts.name, parts.category)
        .having(sql`${installed} > 0`),
      'ler as peças instaladas na máquina',
    );
  }

  async insert(
    values: ComputerTransferInsert,
    executor: DatabaseExecutor,
  ): Promise<ComputerTransferRow> {
    const [row] = await runQuery(
      executor.insert(computerTransfers).values(values).returning(),
      'registrar a transferência',
    );

    return row as ComputerTransferRow;
  }

  async updateComputer(
    id: number,
    values: Partial<typeof computers.$inferInsert>,
    executor: DatabaseExecutor,
  ): Promise<void> {
    await runQuery(
      executor
        .update(computers)
        .set(values)
        .where(and(eq(computers.id, id))),
      'mudar o departamento da máquina',
    );
  }

  async transaction<T>(run: (executor: DatabaseExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => run(tx));
  }
}
