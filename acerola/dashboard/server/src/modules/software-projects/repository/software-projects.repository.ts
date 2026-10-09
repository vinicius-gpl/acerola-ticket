import { Inject, Injectable } from '@nestjs/common';
import { type SoftwareProjectListQuery } from '@template/shared/schemas/software-project.schema';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, type SQL } from 'drizzle-orm';

import { runMaybe, runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  softwareProjects,
  type SoftwareProjectInsert,
  type SoftwareProjectRow,
} from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

export type SoftwareProjectPage = {
  rows: SoftwareProjectRow[];
  total: number;
};

@Injectable()
export class SoftwareProjectsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: SoftwareProjectListQuery): Promise<SoftwareProjectPage> {
    const where = this.buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(softwareProjects)
          .where(where)
          .orderBy(desc(softwareProjects.createdAt), desc(softwareProjects.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar sistemas',
      ),
      runQuery(
        this.db.select({ total: count() }).from(softwareProjects).where(where),
        'contar sistemas',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async listAll(): Promise<SoftwareProjectRow[]> {
    return runQuery(
      this.db.select().from(softwareProjects).orderBy(desc(softwareProjects.createdAt)),
      'listar todos os sistemas',
    );
  }

  /** Projetos que podem receber chamados públicos e virar issues no GitHub. */
  async listTicketOptions(): Promise<{ id: number; name: string }[]> {
    return runQuery(
      this.db
        .select({ id: softwareProjects.id, name: softwareProjects.name })
        .from(softwareProjects)
        .where(
          and(
            inArray(softwareProjects.status, ['active', 'maintenance']),
            isNotNull(softwareProjects.githubRepoOwner),
            isNotNull(softwareProjects.githubRepoName),
          ),
        )
        .orderBy(asc(softwareProjects.name)),
      'listar sistemas para abertura de chamado',
    );
  }

  async isTicketOption(id: number): Promise<boolean> {
    const [project] = await runQuery(
      this.db
        .select({ id: softwareProjects.id })
        .from(softwareProjects)
        .where(
          and(
            eq(softwareProjects.id, id),
            inArray(softwareProjects.status, ['active', 'maintenance']),
            isNotNull(softwareProjects.githubRepoOwner),
            isNotNull(softwareProjects.githubRepoName),
          ),
        )
        .limit(1),
      'validar sistema do chamado',
    );

    return Boolean(project);
  }

  async findById(id: number): Promise<SoftwareProjectRow | null> {
    return runMaybe(
      this.db.select().from(softwareProjects).where(eq(softwareProjects.id, id)).limit(1),
      'buscar sistema por id',
    );
  }

  async insert(data: SoftwareProjectInsert): Promise<SoftwareProjectRow> {
    return runOne(this.db.insert(softwareProjects).values(data).returning(), 'cadastrar sistema');
  }

  async update(id: number, data: Partial<SoftwareProjectInsert>): Promise<SoftwareProjectRow> {
    return runOne(
      this.db.update(softwareProjects).set(data).where(eq(softwareProjects.id, id)).returning(),
      'atualizar sistema',
    );
  }

  async remove(id: number): Promise<void> {
    await runQuery(
      this.db.delete(softwareProjects).where(eq(softwareProjects.id, id)),
      'excluir sistema',
    );
  }

  async countOpenTicketsByProject(projectIds: number[]): Promise<Record<number, number>> {
    if (projectIds.length === 0) return {};

    const rows = await runQuery(
      this.db
        .select({
          projectId: tickets.projectId,
          total: count(),
        })
        .from(tickets)
        .where(
          and(
            inArray(tickets.projectId, projectIds),
            inArray(tickets.status, [
              'open',
              'in_progress',
              'waiting_requester',
              'waiting_third_party',
            ]),
          ),
        )
        .groupBy(tickets.projectId),
      'contar chamados abertos por projeto',
    );

    const counts: Record<number, number> = {};
    for (const row of rows) {
      if (row.projectId !== null) {
        counts[row.projectId] = Number(row.total);
      }
    }
    return counts;
  }

  async countPullRequestsByProject(projectIds: number[]): Promise<Record<number, number>> {
    if (projectIds.length === 0) return {};

    const rows = await runQuery(
      this.db
        .select({
          projectId: softwareTimelineEvents.projectId,
          total: count(),
        })
        .from(softwareTimelineEvents)
        .where(
          and(
            inArray(softwareTimelineEvents.projectId, projectIds),
            eq(softwareTimelineEvents.type, 'pr'),
          ),
        )
        .groupBy(softwareTimelineEvents.projectId),
      'contar PRs por projeto',
    );

    const counts: Record<number, number> = {};
    for (const row of rows) {
      counts[row.projectId] = Number(row.total);
    }
    return counts;
  }

  private buildWhere(query: SoftwareProjectListQuery): SQL | undefined {
    const filters: (SQL | undefined)[] = [];

    if (query.status) {
      filters.push(eq(softwareProjects.status, query.status));
    }

    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(
        or(
          ilike(softwareProjects.name, term),
          ilike(softwareProjects.description, term),
          ilike(softwareProjects.repositoryUrl, term),
        ),
      );
    }

    return filters.length > 0 ? and(...filters) : undefined;
  }
}
