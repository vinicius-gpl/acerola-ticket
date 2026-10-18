import { Inject, Injectable } from '@nestjs/common';
import { type SoftwareTimelineListQuery } from '@template/shared/schemas/software-timeline.schema';
import { and, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';

import { runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import {
  softwareTimelineEvents,
  type SoftwareTimelineEventInsert,
  type SoftwareTimelineEventRow,
} from '../../../lib/db/schema/software-timeline-events.schema';

/**
 * Quantas linhas por consulta. Cada linha leva ~11 parâmetros e o Postgres aceita até 65.535 por
 * consulta: 500 deixa folga larga sem fazer centenas de idas ao banco num repositório grande.
 */
const UPSERT_BATCH = 500;

/**
 * Um item repetido na mesma consulta faz o Postgres recusar o lote inteiro ("não dá para
 * atualizar a mesma linha duas vezes"). Acontece de verdade: um PR alterado enquanto as páginas
 * do GitHub são lidas aparece em duas delas. Vale a última versão.
 */
function lastPerKey(rows: readonly SoftwareTimelineEventInsert[]): SoftwareTimelineEventInsert[] {
  const byKey = new Map<string, SoftwareTimelineEventInsert>();
  for (const row of rows) byKey.set(`${row.projectId}|${row.type}|${row.externalId}`, row);

  return [...byKey.values()];
}

export type TimelineEventWithProject = SoftwareTimelineEventRow & {
  projectName?: string | null;
};

export type SoftwareTimelinePage = {
  rows: TimelineEventWithProject[];
  total: number;
};

@Injectable()
export class SoftwareTimelineRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: SoftwareTimelineListQuery): Promise<SoftwareTimelinePage> {
    const where = this.buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select({
            id: softwareTimelineEvents.id,
            projectId: softwareTimelineEvents.projectId,
            type: softwareTimelineEvents.type,
            externalId: softwareTimelineEvents.externalId,
            title: softwareTimelineEvents.title,
            description: softwareTimelineEvents.description,
            url: softwareTimelineEvents.url,
            author: softwareTimelineEvents.author,
            authorName: softwareTimelineEvents.authorName,
            status: softwareTimelineEvents.status,
            eventDate: softwareTimelineEvents.eventDate,
            createdAt: softwareTimelineEvents.createdAt,
            createdBy: softwareTimelineEvents.createdBy,
            projectName: softwareProjects.name,
          })
          .from(softwareTimelineEvents)
          .leftJoin(softwareProjects, eq(softwareProjects.id, softwareTimelineEvents.projectId))
          .where(where)
          .orderBy(desc(softwareTimelineEvents.eventDate), desc(softwareTimelineEvents.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar timeline',
      ),
      runQuery(
        this.db.select({ total: count() }).from(softwareTimelineEvents).where(where),
        'contar eventos da timeline',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async listRecent(limit = 10): Promise<TimelineEventWithProject[]> {
    return runQuery(
      this.db
        .select({
          id: softwareTimelineEvents.id,
          projectId: softwareTimelineEvents.projectId,
          type: softwareTimelineEvents.type,
          externalId: softwareTimelineEvents.externalId,
          title: softwareTimelineEvents.title,
          description: softwareTimelineEvents.description,
          url: softwareTimelineEvents.url,
          author: softwareTimelineEvents.author,
          authorName: softwareTimelineEvents.authorName,
          status: softwareTimelineEvents.status,
          eventDate: softwareTimelineEvents.eventDate,
          createdAt: softwareTimelineEvents.createdAt,
          createdBy: softwareTimelineEvents.createdBy,
          projectName: softwareProjects.name,
        })
        .from(softwareTimelineEvents)
        .leftJoin(softwareProjects, eq(softwareProjects.id, softwareTimelineEvents.projectId))
        .orderBy(desc(softwareTimelineEvents.eventDate), desc(softwareTimelineEvents.id))
        .limit(limit),
      'listar atividades recentes da timeline',
    );
  }

  async insert(data: SoftwareTimelineEventInsert): Promise<SoftwareTimelineEventRow> {
    return runOne(
      this.db.insert(softwareTimelineEvents).values(data).returning(),
      'adicionar evento na timeline',
    );
  }

  /**
   * Grava PRs e issues vindos do GitHub de uma vez: insere os novos e atualiza os que já existem
   * (mesmo sistema, tipo e número), numa consulta por lote em vez de duas por item.
   *
   * Quem gravou primeiro (`createdBy`, `createdAt`) fica: atualizar não reescreve a autoria.
   * Devolve quantos foram gravados.
   */
  async upsertMany(input: readonly SoftwareTimelineEventInsert[]): Promise<number> {
    const rows = lastPerKey(input);
    let written = 0;
    for (let start = 0; start < rows.length; start += UPSERT_BATCH) {
      const batch = rows.slice(start, start + UPSERT_BATCH);
      const result = await runQuery(
        this.db
          .insert(softwareTimelineEvents)
          .values([...batch])
          .onConflictDoUpdate({
            target: [
              softwareTimelineEvents.projectId,
              softwareTimelineEvents.type,
              softwareTimelineEvents.externalId,
            ],
            set: {
              title: sql.raw('excluded.title'),
              status: sql.raw('excluded.status'),
              url: sql.raw('excluded.url'),
              author: sql.raw('excluded.author'),
              authorName: sql.raw('excluded.author_name'),
              eventDate: sql.raw('excluded.event_date'),
            },
          }),
        'gravar PRs e issues na timeline',
      );
      /* `count` é o que o driver `postgres` devolve: as linhas inseridas ou atualizadas. */
      written += result.count ?? batch.length;
    }

    return written;
  }

  private buildWhere(query: SoftwareTimelineListQuery): SQL | undefined {
    const filters: (SQL | undefined)[] = [];

    if (query.projectId) {
      filters.push(eq(softwareTimelineEvents.projectId, query.projectId));
    }

    if (query.type) {
      filters.push(eq(softwareTimelineEvents.type, query.type));
    }

    if (query.startAt) {
      filters.push(gte(softwareTimelineEvents.eventDate, new Date(query.startAt)));
    }

    if (query.endBefore) {
      filters.push(lt(softwareTimelineEvents.eventDate, new Date(query.endBefore)));
    }

    return filters.length > 0 ? and(...filters) : undefined;
  }
}
