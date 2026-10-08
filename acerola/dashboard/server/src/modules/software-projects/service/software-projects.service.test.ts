import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type SoftwareProjectRow } from '../../../lib/db/schema/software-projects.schema';
import { type SoftwareProjectsRepository } from '../repository/software-projects.repository';
import { type SoftwareTimelineRepository } from '../repository/software-timeline.repository';
import { type GithubService } from './github.service';
import { SoftwareProjectsService } from './software-projects.service';

const admin: RequestUser = {
  id: '1',
  email: 'gestor@empresa.com.br',
  name: 'Gestor Sistema',
  role: 'admin',
  roles: { infra: 'user', sistema: 'admin', manutencao: 'user' },
};

const user: RequestUser = {
  id: '2',
  email: 'dev@empresa.com.br',
  name: 'Dev User',
  role: 'user',
};

function projectRow(overrides: Partial<SoftwareProjectRow> = {}): SoftwareProjectRow {
  return {
    id: 1,
    name: 'Acerola Ticket',
    description: 'Sistema de chamados',
    repositoryUrl: 'vinicius-gpl/acerola-ticket',
    githubRepoOwner: 'vinicius-gpl',
    githubRepoName: 'acerola-ticket',
    status: 'active',
    color: 'blue',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'gestor@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeService(
  repoOverrides: Partial<SoftwareProjectsRepository> = {},
  timelineOverrides: Partial<SoftwareTimelineRepository> = {},
  githubOverrides: Partial<GithubService> = {},
) {
  const repository = {
    list: vi.fn().mockResolvedValue({ rows: [projectRow()], total: 1 }),
    findById: vi.fn().mockResolvedValue(projectRow()),
    insert: vi.fn().mockResolvedValue(projectRow()),
    update: vi.fn().mockResolvedValue(projectRow()),
    remove: vi.fn().mockResolvedValue(undefined),
    countOpenTicketsByProject: vi.fn().mockResolvedValue({ 1: 3 }),
    countPullRequestsByProject: vi.fn().mockResolvedValue({ 1: 5 }),
    ...repoOverrides,
  } as unknown as SoftwareProjectsRepository;

  const timelineRepository = {
    upsertPr: vi.fn().mockResolvedValue(undefined),
    ...timelineOverrides,
  } as unknown as SoftwareTimelineRepository;

  const githubService = {
    fetchPullRequests: vi.fn().mockResolvedValue([]),
    fetchIssues: vi.fn().mockResolvedValue([]),
    createIssue: vi.fn().mockResolvedValue(null),
    syncTicketToIssueInBackground: vi.fn(),
    ...githubOverrides,
  } as unknown as GithubService;

  return {
    service: new SoftwareProjectsService(repository, timelineRepository, githubService),
    repository,
    timelineRepository,
    githubService,
  };
}

describe('SoftwareProjectsService', () => {
  it('rejects internal managers before writing a project even with an external admin role', async () => {
    const { service, repository } = makeService();
    const manager: RequestUser = {
      ...admin,
      roles: { infra: 'admin', sistema: 'manager', manutencao: 'admin' },
    };
    await expect(service.update(manager, 1, { name: 'Forbidden' })).rejects.toThrow(
      'Somente administradores',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
  describe('list', () => {
    it('returns projects mapped with counts of open tickets and PRs', async () => {
      const { service } = makeService();

      const result = await service.list(user, { page: 1, pageSize: 10 });

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 1,
        name: 'Acerola Ticket',
        openTicketsCount: 3,
        pullRequestsCount: 5,
      });
    });
  });

  describe('findById', () => {
    it('returns project with metrics when found', async () => {
      const { service } = makeService();

      const project = await service.findById(user, 1);

      expect(project.id).toBe(1);
      expect(project.openTicketsCount).toBe(3);
      expect(project.pullRequestsCount).toBe(5);
    });

    it('throws NotFoundException when project does not exist', async () => {
      const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) });

      await expect(service.findById(user, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('inserts and returns new project', async () => {
      const { service, repository } = makeService();

      const project = await service.create(admin, {
        name: 'Novo Sistema',
        repositoryUrl: 'owner/repo',
        status: 'active',
        color: 'green',
      });

      expect(repository.insert).toHaveBeenCalled();
      expect(project.id).toBe(1);
    });
  });

  describe('update', () => {
    it('updates existing project and returns updated version', async () => {
      const { service, repository } = makeService();

      const updated = await service.update(admin, 1, {
        name: 'Nome Atualizado',
      });

      expect(repository.update).toHaveBeenCalled();
      expect(updated.id).toBe(1);
    });
  });

  describe('remove', () => {
    it('removes project when caller has permission', async () => {
      const { service, repository } = makeService();

      await service.remove(admin, 1);

      expect(repository.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('syncGithubPrs', () => {
    it('fetches PRs and upserts into timeline repository', async () => {
      const { service, timelineRepository } = makeService(
        {},
        {},
        {
          fetchPullRequests: vi.fn().mockResolvedValue([
            {
              externalId: '#12',
              title: 'PR teste',
              url: 'https://github.com/pr/12',
              author: 'octocat',
              status: 'merged',
              eventDate: new Date('2026-10-01T00:00:00.000Z'),
            },
          ]),
        },
      );

      const result = await service.syncGithubPrs(admin, 1);

      expect(result.synced).toBe(1);
      expect(timelineRepository.upsertPr).toHaveBeenCalledTimes(1);
    });
  });
});
