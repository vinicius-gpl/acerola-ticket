import {
  SCHEDULE_EVENT_CATEGORIES,
  SOFTWARE_PROJECT_COLORS,
} from '@template/shared/domain/software-project.util';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { softwareProjects } from './software-projects.schema';

const ALL_SCHEDULE_COLORS = [...SOFTWARE_PROJECT_COLORS, 'neutral', 'red'] as const;

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Eventos da Agenda / Cronograma Semanal (Week Schedule Grid).
 */
export const softwareScheduleEvents = pgTable(
  'software_schedule_events',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').references(() => softwareProjects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    category: text('category', { enum: SCHEDULE_EVENT_CATEGORIES })
      .notNull()
      .default('other'),
    color: text('color', { enum: ALL_SCHEDULE_COLORS })
      .notNull()
      .default('blue'),
    date: text('date').notNull(), // Formato YYYY-MM-DD
    startTime: text('start_time').notNull(), // HH:mm
    endTime: text('end_time').notNull(), // HH:mm
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('software_schedule_project_idx').on(table.projectId),
    index('software_schedule_date_idx').on(table.date),
    check(
      'software_schedule_category_valid',
      sql`${table.category} in (${valuesFor(SCHEDULE_EVENT_CATEGORIES)})`,
    ),
    check(
      'software_schedule_color_valid',
      sql`${table.color} in (${valuesFor(ALL_SCHEDULE_COLORS)})`,
    ),
  ],
);

export type SoftwareScheduleEventRow = typeof softwareScheduleEvents.$inferSelect;
export type SoftwareScheduleEventInsert = typeof softwareScheduleEvents.$inferInsert;
