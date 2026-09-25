import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { qualified } from '../../../lib/db/sql-column.util';
import { computers } from '../../../lib/db/schema/computers.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import { parts } from '../../../lib/db/schema/parts.schema';

export type BudgetComputerRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
  totalMemoryBytes: number | null;
  totalDiskBytes: number | null;
  freeDiskBytes: number | null;
  maintenanceCount: number;
};

export type StockRow = {
  category: string;
  balance: number;
};

/**
 * Os dois lados da conta do orçamento: o que o parque pede, e o que a prateleira já tem.
 *
 * Duas consultas, e não uma com `join`: cruzar computadores com peças no SQL multiplicaria
 * cada máquina pelo número de peças do depósito, e o total de máquinas sairia inflado. O
 * encontro dos dois lados acontece no service, em memória, onde é uma soma simples.
 *
 * Máquina ARQUIVADA ou DESCARTADA fica de fora: comprar memória para um computador que saiu
 * de uso é o tipo de pedido que faz uma lista de compras perder a credibilidade.
 */
@Injectable()
export class BudgetRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** O hardware de cada máquina em uso, com quantas manutenções ela já consumiu. */
  async computers(): Promise<BudgetComputerRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: computers.name,
          computerDisplayName: computers.displayName,
          department: computers.department,
          totalMemoryBytes: computers.totalMemoryBytes,
          totalDiskBytes: computers.totalDiskBytes,
          freeDiskBytes: computers.freeDiskBytes,
          /* Subconsulta, e não `join`: com `join` cada manutenção repetiria a linha da
             máquina, e a mesma máquina seria contada várias vezes na necessidade. */
          maintenanceCount: sql<number>`(
            select count(*)::int from ${maintenances}
            where ${qualified(maintenances.computerId)} = ${qualified(computers.id)}
          )`,
        })
        .from(computers)
        .where(and(eq(computers.isArchived, false), isNull(computers.disposedAt))),
      'ler o parque para o orçamento',
    );
  }

  /**
   * Quanto o depósito tem de cada categoria, somando peça nova e usada.
   *
   * Aqui as duas condições SOMAM, ao contrário da tela do Depósito, que as mantém separadas:
   * para decidir uma compra, um pente usado na prateleira é um pente que não precisa ser
   * comprado. A tela diz isso em uma linha, para ninguém achar que vai receber peça nova.
   */
  async stock(): Promise<StockRow[]> {
    return runQuery(
      this.db
        .select({
          category: parts.category,
          balance: sql<number>`coalesce(sum(${parts.balance}), 0)::int`,
        })
        .from(parts)
        .groupBy(parts.category),
      'ler o saldo do depósito',
    );
  }
}
