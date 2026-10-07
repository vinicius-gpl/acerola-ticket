import {
  TIMELINE_EVENT_STATUSES,
  TIMELINE_EVENT_TYPES,
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

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Eventos da Timeline dos Sistemas (Pull Requests do GitHub, releases, deploys e issues).
 */
export const softwareTimelineEvents = pgTable(
  'software_timeline_events',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => softwareProjects.id, { onDelete: 'cascade' }),
    type: text('type', { enum: TIMELINE_EVENT_TYPES }).notNull(),
    externalId: text('external_id'), // Ex: '#42'
    title: text('title').notNull(),
    description: text('description'),
    url: text('url'),
    author: text('author'),
    status: text('status', { enum: TIMELINE_EVENT_STATUSES }).notNull().default('open'),
    eventDate: timestamp('event_date', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    index('software_timeline_project_idx').on(table.projectId),
    index('software_timeline_type_idx').on(table.type),
    index('software_timeline_date_idx').on(table.eventDate),
    check(
      'software_timeline_type_valid',
      sql`${table.type} in (${valuesFor(TIMELINE_EVENT_TYPES)})`,
    ),
    check(
      'software_timeline_status_valid',
      sql`${table.status} in (${valuesFor(TIMELINE_EVENT_STATUSES)})`,
    ),
  ],
);

export type SoftwareTimelineEventRow = typeof softwareTimelineEvents.$inferSelect;
export type SoftwareTimelineEventInsert = typeof softwareTimelineEvents.$inferInsert;
