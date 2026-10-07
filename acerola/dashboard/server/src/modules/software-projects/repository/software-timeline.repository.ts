import { Inject, Injectable } from '@nestjs/common';
import { type SoftwareTimelineListQuery } from '@template/shared/schemas/software-timeline.schema';
import {
  and,
  count,
  desc,
  eq,
  type SQL,
} from 'drizzle-orm';

import { runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import {
  softwareTimelineEvents,
  type SoftwareTimelineEventInsert,
  type SoftwareTimelineEventRow,
} from '../../../lib/db/schema/software-timeline-events.schema';

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

  async upsertPr(data: SoftwareTimelineEventInsert): Promise<SoftwareTimelineEventRow> {
    if (!data.externalId) {
      return this.insert(data);
    }

    // Procura se já existe evento com o mesmo externalId e projectId
    const existing = await runQuery(
      this.db
        .select()
        .from(softwareTimelineEvents)
        .where(
          and(
            eq(softwareTimelineEvents.projectId, data.projectId),
            eq(softwareTimelineEvents.externalId, data.externalId),
          ),
        )
        .limit(1),
      'verificar PR existente',
    );

    if (existing.length > 0 && existing[0]) {
      return runOne(
        this.db
          .update(softwareTimelineEvents)
          .set({
            title: data.title,
            status: data.status,
            url: data.url,
            author: data.author,
            eventDate: data.eventDate,
          })
          .where(eq(softwareTimelineEvents.id, existing[0].id))
          .returning(),
        'atualizar PR na timeline',
      );
    }

    return this.insert(data);
  }

  private buildWhere(query: SoftwareTimelineListQuery): SQL | undefined {
    const filters: (SQL | undefined)[] = [];

    if (query.projectId) {
      filters.push(eq(softwareTimelineEvents.projectId, query.projectId));
    }

    if (query.type) {
      filters.push(eq(softwareTimelineEvents.type, query.type));
    }

    return filters.length > 0 ? and(...filters) : undefined;
  }
}
