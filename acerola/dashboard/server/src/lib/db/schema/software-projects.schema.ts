import {
  SOFTWARE_PROJECT_COLORS,
  SOFTWARE_PROJECT_STATUSES,
} from '@template/shared/domain/software-project.util';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Os SISTEMAS E PROJETOS DE SOFTWARE: cadastros dos sistemas em que a equipe trabalha.
 *
 * Cada sistema guarda seu repositório no GitHub para integração automática com Issues e PRs.
 */
export const softwareProjects = pgTable(
  'software_projects',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    repositoryUrl: text('repository_url').notNull(),
    status: text('status', { enum: SOFTWARE_PROJECT_STATUSES }).notNull().default('active'),
    color: text('color', { enum: SOFTWARE_PROJECT_COLORS }).notNull().default('blue'),
    githubRepoOwner: text('github_repo_owner'),
    githubRepoName: text('github_repo_name'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('software_projects_status_idx').on(table.status),
    index('software_projects_name_idx').on(table.name),
    check('software_projects_status_valid', sql`${table.status} in (${valuesFor(SOFTWARE_PROJECT_STATUSES)})`),
    check('software_projects_color_valid', sql`${table.color} in (${valuesFor(SOFTWARE_PROJECT_COLORS)})`),
  ],
);

export type SoftwareProjectRow = typeof softwareProjects.$inferSelect;
export type SoftwareProjectInsert = typeof softwareProjects.$inferInsert;
