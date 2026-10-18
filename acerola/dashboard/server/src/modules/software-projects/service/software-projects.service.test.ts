import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type SoftwareProjectRow } from '../../../lib/db/schema/software-projects.schema';
import { type TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
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

const superAdmin: RequestUser = {
  id: '9',
  email: 'super@empresa.com.br',
  name: 'Super Admin',
  role: 'superadmin',
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
    responsibleId: null,
    responsibleName: null,
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
    upsertMany: vi.fn().mockResolvedValue(0),
    ...timelineOverrides,
  } as unknown as SoftwareTimelineRepository;

  const githubService = {
    fetchPullRequests: vi.fn().mockResolvedValue([]),
    fetchIssues: vi.fn().mockResolvedValue([]),
    createIssue: vi.fn().mockResolvedValue(null),
    syncTicketToIssueInBackground: vi.fn(),
    ...githubOverrides,
  } as unknown as GithubService;

  /* Quem atende Sistema: só a Ana. O nome sai daqui, nunca do corpo. */
  const assignees = {
    resolve: vi.fn(async (_area: string, id: string) =>
      id === 'u-ana' ? { id: 'u-ana', name: 'Ana Lima' } : null,
    ),
  } as unknown as TicketAssigneesService;

  return {
    service: new SoftwareProjectsService(repository, timelineRepository, githubService, assignees),
    repository,
    timelineRepository,
    githubService,
    assignees,
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

    // feliz
    it('syncs pull requests and issues right after the project is created', async () => {
      const issue = {
        externalId: '#7',
        title: 'Corrige login',
        url: 'https://github.com/owner/repo/issues/7',
        author: 'ana',
        authorName: 'Ana Lima',
        status: 'closed' as const,
        eventDate: new Date('2026-10-10T12:00:00Z'),
      };
      const { service, timelineRepository, githubService } = makeService(
        {},
        {},
        { fetchIssues: vi.fn().mockResolvedValue([issue]) },
      );

      await service.create(admin, {
        name: 'Novo Sistema',
        repositoryUrl: 'owner/repo',
        status: 'active',
        color: 'green',
      });

      await vi.waitFor(() => expect(timelineRepository.upsertMany).toHaveBeenCalledTimes(2));
      expect(githubService.fetchIssues).toHaveBeenCalledWith(
        'vinicius-gpl',
        'acerola-ticket',
        admin.id,
        undefined,
      );
      expect(timelineRepository.upsertMany).toHaveBeenLastCalledWith([
        expect.objectContaining({ projectId: 1, type: 'issue', externalId: '#7', status: 'closed' }),
      ]);
    });

    // triste
    it('still creates the project when the initial GitHub sync fails', async () => {
      const { service, timelineRepository } = makeService(
        {},
        {},
        { fetchPullRequests: vi.fn().mockRejectedValue(new Error('GitHub fora do ar')) },
      );

      const project = await service.create(admin, {
        name: 'Novo Sistema',
        repositoryUrl: 'owner/repo',
        status: 'active',
        color: 'green',
      });

      expect(project.id).toBe(1);
      expect(timelineRepository.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('syncAllGithub', () => {
    // feliz
    it('syncs every project and tells which ones failed', async () => {
      const { service, githubService } = makeService(
        {
          listAll: vi.fn().mockResolvedValue([
            projectRow({ id: 1, name: 'Chamados', githubRepoOwner: 'org', githubRepoName: 'ok' }),
            projectRow({ id: 2, name: 'Paralegal', githubRepoOwner: 'org', githubRepoName: 'fora' }),
          ]),
        },
        {},
        {
          fetchPullRequests: vi.fn(async (_owner: string, repo: string) => {
            if (repo === 'fora') throw new Error('sem acesso');
            return [];
          }),
        },
      );

      const result = await service.syncAllGithub(superAdmin);

      expect(result.projects).toBe(1);
      expect(result.failed).toEqual(['Paralegal']);
      expect(result.message).toContain('Não foi possível sincronizar: Paralegal');
      expect(githubService.fetchIssues).toHaveBeenCalledWith('org', 'ok', superAdmin.id, undefined);
    });

    // triste
    it('refuses anyone who is not a super administrator, even a Sistema admin', async () => {
      const { service, repository } = makeService({ listAll: vi.fn().mockResolvedValue([]) });

      await expect(service.syncAllGithub(admin)).rejects.toThrow('Super Administrador');
      expect(repository.listAll).not.toHaveBeenCalled();
    });
  });

  describe('syncAllGithubSince', () => {
    // feliz
    it('asks GitHub only for what changed since the given date, as the system', async () => {
      const since = new Date('2026-10-16T03:00:00Z');
      const { service, githubService } = makeService({
        listAll: vi.fn().mockResolvedValue([
          projectRow({ githubRepoOwner: 'org', githubRepoName: 'repo' }),
        ]),
      });

      await service.syncAllGithubSince(since);

      expect(githubService.fetchPullRequests).toHaveBeenCalledWith('org', 'repo', undefined, since);
      expect(githubService.fetchIssues).toHaveBeenCalledWith('org', 'repo', undefined, since);
    });

    // triste
    it('skips projects whose repository address cannot be read', async () => {
      const { service, githubService } = makeService({
        listAll: vi.fn().mockResolvedValue([
          projectRow({ githubRepoOwner: null, githubRepoName: null, repositoryUrl: 'sem-repo' }),
        ]),
      });

      const result = await service.syncAllGithubSince(new Date());

      expect(result.projects).toBe(0);
      expect(githubService.fetchPullRequests).not.toHaveBeenCalled();
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

  describe('responsible', () => {
    // feliz
    /* O NOME vem do cadastro de quem atende Sistema: só o id é aceito de fora. */
    it('stamps the name of the responsible from who attends Sistema', async () => {
      const { service, repository } = makeService();

      await service.create(admin, {
        name: 'Novo Sistema',
        repositoryUrl: 'owner/repo',
        status: 'active',
        color: 'green',
        responsibleId: 'u-ana',
      });

      expect(vi.mocked(repository.insert).mock.calls[0]?.[0]).toMatchObject({
        responsibleId: 'u-ana',
        responsibleName: 'Ana Lima',
      });
    });

    it('takes the responsible off when the body says null, and keeps it when silent', async () => {
      const { service, repository, assignees } = makeService();

      await service.update(admin, 1, { responsibleId: null });
      await service.update(admin, 1, { name: 'Outro nome' });

      expect(vi.mocked(repository.update).mock.calls[0]?.[1]).toMatchObject({
        responsibleId: null,
        responsibleName: null,
      });
      expect(vi.mocked(repository.update).mock.calls[1]?.[1]).not.toHaveProperty('responsibleId');
      expect(assignees.resolve).not.toHaveBeenCalled();
    });

    // triste
    it('refuses a responsible who does not attend Sistema', async () => {
      const { service, repository } = makeService();

      await expect(service.update(admin, 1, { responsibleId: 'u-caio' })).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(repository.update).not.toHaveBeenCalled();
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
      /* Um lote para os PRs e um para as issues — nunca uma gravação por item. */
      expect(timelineRepository.upsertMany).toHaveBeenCalledTimes(2);
      expect(vi.mocked(timelineRepository.upsertMany).mock.calls[0]?.[0]).toHaveLength(1);
    });
  });
});
