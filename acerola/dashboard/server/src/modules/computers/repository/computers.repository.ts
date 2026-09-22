import { Inject, Injectable } from '@nestjs/common';
import { type ComputerListQuery } from '@template/shared/schemas/computer.schema';
import { and, count, desc, eq, gte, ilike, or, sql, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  computerAlerts,
  type ComputerAlertInsert,
  type ComputerAlertRow,
} from '../../../lib/db/schema/computer-alerts.schema';
import {
  computerSamples,
  type ComputerSampleInsert,
  type ComputerSampleRow,
} from '../../../lib/db/schema/computer-samples.schema';
import {
  computers,
  type ComputerInsert,
  type ComputerRow,
} from '../../../lib/db/schema/computers.schema';

export type ComputerPage = {
  rows: ComputerRow[];
  total: number;
};

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 *
 * **Não há `delete` de computador.** Máquina que saiu de uso é arquivada: o histórico dela é
 * o que sustenta "esta aqui deu problema demais, vamos trocar" na hora de decidir compra.
 * Amostras e alertas, sim, são apagados por idade — ver `deleteSamplesOlderThan`.
 */
@Injectable()
export class ComputersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: ComputerListQuery): Promise<ComputerPage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(computers)
          .where(where)
          /* Pior saúde primeiro: a lista serve para achar o que precisa de atenção, e quem
             abre o inventário está procurando problema, não ordem alfabética. */
          .orderBy(desc(computers.healthScore), computers.name)
          .limit(query.pageSize)
          .offset(offset),
        'listar computadores',
      ),
      runQuery(
        this.db.select({ total: count() }).from(computers).where(where),
        'contar computadores',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.id, id)).limit(1),
      'ler computador',
    );
  }

  /**
   * Pelo HASH do token: é assim que o agente se identifica, a cada conexão.
   *
   * Não é pelo nome de propósito — alguém renomear a máquina no Windows não pode fazer a
   * telemetria dela parar de achar a ficha.
   */
  async findByTokenHash(tokenHash: string): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.tokenHash, tokenHash)).limit(1),
      'encontrar computador do agente',
    );
  }

  async insert(values: ComputerInsert): Promise<ComputerRow> {
    const [row] = await runQuery(
      this.db.insert(computers).values(values).returning(),
      'cadastrar computador',
    );

    return row as ComputerRow;
  }

  async update(id: number, values: Partial<ComputerInsert>): Promise<ComputerRow> {
    const [row] = await runQuery(
      this.db.update(computers).set(values).where(eq(computers.id, id)).returning(),
      'salvar computador',
    );

    return row as ComputerRow;
  }

  async insertSample(values: ComputerSampleInsert): Promise<void> {
    await runQuery(this.db.insert(computerSamples).values(values), 'gravar amostra de uso');
  }

  /**
   * As amostras de uma máquina desde um instante, da mais antiga para a mais nova.
   *
   * Ordem crescente porque é assim que um gráfico de linha lê: invertida, a linha andaria
   * para trás.
   */
  async listSamplesSince(computerId: number, since: Date): Promise<ComputerSampleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(computerSamples)
        .where(and(eq(computerSamples.computerId, computerId), gte(computerSamples.sampledAt, since)))
        .orderBy(computerSamples.sampledAt),
      'ler o uso da máquina',
    );
  }

  /**
   * A limpeza por idade da série.
   *
   * Sem ela a tabela cresce para sempre: uma frota de cinquenta máquinas enviando a cada
   * trinta segundos passa de quatro milhões de linhas por mês. O gráfico só olha as últimas
   * horas, então guardar tudo seria pagar banco para ninguém consultar.
   */
  async deleteSamplesOlderThan(cutoff: Date): Promise<number> {
    const deleted = await runQuery(
      this.db
        .delete(computerSamples)
        .where(sql`${computerSamples.sampledAt} < ${cutoff}`)
        .returning({ id: computerSamples.id }),
      'limpar amostras antigas',
    );

    return deleted.length;
  }

  async insertAlert(values: ComputerAlertInsert): Promise<ComputerAlertRow> {
    const [row] = await runQuery(
      this.db.insert(computerAlerts).values(values).returning(),
      'abrir alerta',
    );

    return row as ComputerAlertRow;
  }

  /** O alerta ABERTO daquela medida, se houver — é o que evita abrir um novo a cada leitura. */
  async findActiveAlert(computerId: number, metric: string): Promise<ComputerAlertRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(computerAlerts)
        .where(
          and(
            eq(computerAlerts.computerId, computerId),
            eq(computerAlerts.metric, metric as ComputerAlertRow['metric']),
            eq(computerAlerts.status, 'active'),
          ),
        )
        .limit(1),
      'ler alerta ativo',
    );
  }

  async updateAlert(id: number, values: Partial<ComputerAlertInsert>): Promise<void> {
    await runQuery(
      this.db.update(computerAlerts).set(values).where(eq(computerAlerts.id, id)),
      'atualizar alerta',
    );
  }

  async listAlerts(computerId: number, limit: number): Promise<ComputerAlertRow[]> {
    return runQuery(
      this.db
        .select()
        .from(computerAlerts)
        .where(eq(computerAlerts.computerId, computerId))
        .orderBy(desc(computerAlerts.startedAt))
        .limit(limit),
      'ler alertas da máquina',
    );
  }
}

/**
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres.
 *
 * A máquina arquivada fica de FORA por padrão: ela saiu de uso, e quem abre o inventário está
 * trabalhando com o que está em uso hoje.
 */
function buildWhere(query: ComputerListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (!query.includeArchived) filters.push(eq(computers.isArchived, false));
  if (query.department) filters.push(eq(computers.department, query.department));
  if (query.healthStatus) filters.push(eq(computers.healthStatus, query.healthStatus));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        ilike(computers.name, term),
        ilike(computers.displayName, term),
        ilike(computers.responsibleName, term),
        ilike(computers.cpuModel, term),
      ),
    );
  }

  return filters.length > 0 ? and(...filters) : undefined;
}
