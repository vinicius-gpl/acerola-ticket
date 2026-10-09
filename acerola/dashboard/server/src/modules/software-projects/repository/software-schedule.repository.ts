import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { runMaybe, runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import {
  softwareScheduleEvents,
  type SoftwareScheduleEventInsert,
  type SoftwareScheduleEventRow,
} from '../../../lib/db/schema/software-schedule-events.schema';

export type ScheduleEventWithProject = SoftwareScheduleEventRow & {
  projectName?: string | null;
};

@Injectable()
export class SoftwareScheduleRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listBetween(startDate: string, endDate: string): Promise<ScheduleEventWithProject[]> {
    return runQuery(
      this.db
        .select({
          id: softwareScheduleEvents.id,
          projectId: softwareScheduleEvents.projectId,
          title: softwareScheduleEvents.title,
          category: softwareScheduleEvents.category,
          color: softwareScheduleEvents.color,
          date: softwareScheduleEvents.date,
          startTime: softwareScheduleEvents.startTime,
          endTime: softwareScheduleEvents.endTime,
          note: softwareScheduleEvents.note,
          createdAt: softwareScheduleEvents.createdAt,
          createdBy: softwareScheduleEvents.createdBy,
          updatedAt: softwareScheduleEvents.updatedAt,
          updatedBy: softwareScheduleEvents.updatedBy,
          projectName: softwareProjects.name,
        })
        .from(softwareScheduleEvents)
        .leftJoin(softwareProjects, eq(softwareProjects.id, softwareScheduleEvents.projectId))
        .where(
          and(
            gte(softwareScheduleEvents.date, startDate),
            lte(softwareScheduleEvents.date, endDate),
          ),
        )
        .orderBy(asc(softwareScheduleEvents.date), asc(softwareScheduleEvents.startTime)),
      'listar compromissos do cronograma',
    );
  }

  async findById(id: number): Promise<ScheduleEventWithProject | null> {
    return runMaybe(
      this.db
        .select({
          id: softwareScheduleEvents.id,
          projectId: softwareScheduleEvents.projectId,
          title: softwareScheduleEvents.title,
          category: softwareScheduleEvents.category,
          color: softwareScheduleEvents.color,
          date: softwareScheduleEvents.date,
          startTime: softwareScheduleEvents.startTime,
          endTime: softwareScheduleEvents.endTime,
          note: softwareScheduleEvents.note,
          createdAt: softwareScheduleEvents.createdAt,
          createdBy: softwareScheduleEvents.createdBy,
          updatedAt: softwareScheduleEvents.updatedAt,
          updatedBy: softwareScheduleEvents.updatedBy,
          projectName: softwareProjects.name,
        })
        .from(softwareScheduleEvents)
        .leftJoin(softwareProjects, eq(softwareProjects.id, softwareScheduleEvents.projectId))
        .where(eq(softwareScheduleEvents.id, id))
        .limit(1),
      'buscar compromisso do cronograma por id',
    );
  }

  async insert(data: SoftwareScheduleEventInsert): Promise<SoftwareScheduleEventRow> {
    return runOne(
      this.db.insert(softwareScheduleEvents).values(data).returning(),
      'adicionar compromisso no cronograma',
    );
  }

  async update(id: number, data: Partial<SoftwareScheduleEventInsert>): Promise<SoftwareScheduleEventRow> {
    return runOne(
      this.db
        .update(softwareScheduleEvents)
        .set(data)
        .where(eq(softwareScheduleEvents.id, id))
        .returning(),
      'atualizar compromisso no cronograma',
    );
  }

  async remove(id: number): Promise<void> {
    await runQuery(
      this.db.delete(softwareScheduleEvents).where(eq(softwareScheduleEvents.id, id)),
      'excluir compromisso do cronograma',
    );
  }
}
