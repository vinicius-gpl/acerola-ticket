import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseGitHubRepo } from '@template/shared/domain/software-project.util';
import {
  type CreateSoftwareProjectInput,
  type SoftwareProject,
  type SoftwareProjectListQuery,
  type UpdateSoftwareProjectInput,
} from '@template/shared/schemas/software-project.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  assertCanManageInContext,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import {
  toSoftwareProject,
  toSoftwareProjectInsert,
  toSoftwareProjectUpdate,
} from '../mapper/software-projects.mapper';
import {
  SoftwareProjectsRepository,
  type SoftwareProjectPage,
} from '../repository/software-projects.repository';
import { SoftwareTimelineRepository } from '../repository/software-timeline.repository';
import { GithubService } from './github.service';

export const PROJECT_NOT_FOUND = 'Sistema não encontrado.';

@Injectable()
export class SoftwareProjectsService {
  constructor(
    private readonly repository: SoftwareProjectsRepository,
    private readonly timelineRepository: SoftwareTimelineRepository,
    private readonly githubService: GithubService,
  ) {}

  async list(
    user: RequestUser,
    query: SoftwareProjectListQuery,
  ): Promise<{ items: SoftwareProject[]; total: number; page: number; pageSize: number }> {
    assertCanRead(user.role, 'os sistemas');

    const page: SoftwareProjectPage = await this.repository.list(query);
    const ids = page.rows.map((row) => row.id);

    const [openTicketsMap, prsMap] = await Promise.all([
      this.repository.countOpenTicketsByProject(ids),
      this.repository.countPullRequestsByProject(ids),
    ]);

    const items = page.rows.map((row) =>
      toSoftwareProject(row, openTicketsMap[row.id] ?? 0, prsMap[row.id] ?? 0),
    );

    return {
      items,
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(user: RequestUser, id: number): Promise<SoftwareProject> {
    assertCanRead(user.role, 'os sistemas');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(PROJECT_NOT_FOUND);

    const [openTicketsMap, prsMap] = await Promise.all([
      this.repository.countOpenTicketsByProject([id]),
      this.repository.countPullRequestsByProject([id]),
    ]);

    return toSoftwareProject(row, openTicketsMap[id] ?? 0, prsMap[id] ?? 0);
  }

  async create(user: RequestUser, input: CreateSoftwareProjectInput): Promise<SoftwareProject> {
    assertCanManageInContext(user, 'sistema', 'cadastrar sistema');

    const row = await this.repository.insert(toSoftwareProjectInsert(input, user.email));

    // Se o repositório for válido, dispara a sincronização inicial de PRs em background
    const repoInfo = parseGitHubRepo(row.repositoryUrl);
    if (repoInfo) {
      void this.syncGithubPrsSilently(row.id, repoInfo.owner, repoInfo.repo, user.email);
    }

    return toSoftwareProject(row, 0, 0);
  }

  async update(
    user: RequestUser,
    id: number,
    input: UpdateSoftwareProjectInput,
  ): Promise<SoftwareProject> {
    assertCanManageInContext(user, 'sistema', 'alterar sistema');

    await this.findById(user, id);

    const row = await this.repository.update(id, toSoftwareProjectUpdate(input, user.email));

    const [openTicketsMap, prsMap] = await Promise.all([
      this.repository.countOpenTicketsByProject([id]),
      this.repository.countPullRequestsByProject([id]),
    ]);

    return toSoftwareProject(row, openTicketsMap[id] ?? 0, prsMap[id] ?? 0);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanManageInContext(user, 'sistema', 'excluir sistema');

    await this.findById(user, id);
    await this.repository.remove(id);
  }

  async syncGithubPrs(
    user: RequestUser,
    id: number,
  ): Promise<{ synced: number; message: string }> {
    assertCanManageInContext(user, 'sistema', 'sincronizar PRs com GitHub');

    const project = await this.findById(user, id);
    const repoInfo =
      project.githubRepoOwner && project.githubRepoName
        ? { owner: project.githubRepoOwner, repo: project.githubRepoName }
        : parseGitHubRepo(project.repositoryUrl);

    if (!repoInfo) {
      return { synced: 0, message: 'URL do GitHub não reconhecida.' };
    }

    const prs = await this.githubService.fetchPullRequests(repoInfo.owner, repoInfo.repo);
    for (const pr of prs) {
      await this.timelineRepository.upsertPr({
        projectId: id,
        type: 'pr',
        externalId: pr.externalId,
        title: pr.title,
        url: pr.url,
        author: pr.author,
        status: pr.status,
        eventDate: pr.eventDate,
        createdBy: user.email,
      });
    }

    return {
      synced: prs.length,
      message: `${prs.length} Pull Requests sincronizados com sucesso.`,
    };
  }

  private async syncGithubPrsSilently(
    projectId: number,
    owner: string,
    repo: string,
    actorEmail: string,
  ): Promise<void> {
    try {
      const prs = await this.githubService.fetchPullRequests(owner, repo);
      for (const pr of prs) {
        await this.timelineRepository.upsertPr({
          projectId,
          type: 'pr',
          externalId: pr.externalId,
          title: pr.title,
          url: pr.url,
          author: pr.author,
          status: pr.status,
          eventDate: pr.eventDate,
          createdBy: actorEmail,
        });
      }
    } catch {
      // Ignora erro em sincronização silenciosa de background
    }
  }
}
