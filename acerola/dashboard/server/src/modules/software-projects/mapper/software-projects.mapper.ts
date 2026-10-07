import { parseGitHubRepo } from '@template/shared/domain/software-project.util';
import {
  type CreateSoftwareProjectInput,
  type SoftwareProject,
  type UpdateSoftwareProjectInput,
} from '@template/shared/schemas/software-project.schema';
import {
  type SoftwareScheduleEvent,
} from '@template/shared/schemas/software-schedule.schema';
import {
  type SoftwareTimelineEvent,
} from '@template/shared/schemas/software-timeline.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import {
  type SoftwareProjectInsert,
  type SoftwareProjectRow,
} from '../../../lib/db/schema/software-projects.schema';
import {
  type SoftwareScheduleEventRow,
} from '../../../lib/db/schema/software-schedule-events.schema';
import {
  type SoftwareTimelineEventRow,
} from '../../../lib/db/schema/software-timeline-events.schema';

export function toSoftwareProject(
  row: SoftwareProjectRow,
  openTicketsCount = 0,
  pullRequestsCount = 0,
): SoftwareProject {
  const parsedRepo = parseGitHubRepo(row.repositoryUrl);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    repositoryUrl: row.repositoryUrl,
    status: row.status,
    color: row.color,
    githubRepoOwner: row.githubRepoOwner ?? parsedRepo?.owner ?? null,
    githubRepoName: row.githubRepoName ?? parsedRepo?.repo ?? null,
    openTicketsCount,
    pullRequestsCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toSoftwareProjectInsert(
  input: CreateSoftwareProjectInput,
  actorEmail: string,
): SoftwareProjectInsert {
  const parsedRepo = parseGitHubRepo(input.repositoryUrl);

  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    repositoryUrl: input.repositoryUrl.trim(),
    status: input.status,
    color: input.color,
    githubRepoOwner: parsedRepo?.owner ?? null,
    githubRepoName: parsedRepo?.repo ?? null,
    createdBy: actorEmail,
  };
}

export function toSoftwareProjectUpdate(
  input: UpdateSoftwareProjectInput,
  actorEmail: string,
  now: Date = new Date(),
): Partial<SoftwareProjectInsert> {
  const update: Partial<SoftwareProjectInsert> = {
    updatedAt: now,
    updatedBy: actorEmail,
  };

  setIfDefined(update, 'name', input.name?.trim());
  if (input.description !== undefined) {
    update.description = input.description?.trim() || null;
  }
  if (input.repositoryUrl !== undefined) {
    update.repositoryUrl = input.repositoryUrl.trim();
    const parsed = parseGitHubRepo(input.repositoryUrl);
    update.githubRepoOwner = parsed?.owner ?? null;
    update.githubRepoName = parsed?.repo ?? null;
  }
  setIfDefined(update, 'status', input.status);
  setIfDefined(update, 'color', input.color);

  return update;
}

export function toSoftwareTimelineEvent(
  row: SoftwareTimelineEventRow,
  projectName?: string,
): SoftwareTimelineEvent {
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: projectName ?? null,
    type: row.type,
    externalId: row.externalId,
    title: row.title,
    description: row.description,
    url: row.url,
    author: row.author,
    status: row.status,
    eventDate: row.eventDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSoftwareScheduleEvent(
  row: SoftwareScheduleEventRow,
  projectName?: string,
): SoftwareScheduleEvent {
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: projectName ?? null,
    title: row.title,
    category: row.category,
    color: row.color,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
