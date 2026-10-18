import {
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
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
  assertCanEditSystem,
  assertCanRead,
  assertIsSuperAdmin,
} from '../../../lib/policy/policy-assert.util';
import { TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import {
  type ProjectResponsible,
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
/** Quem aparece como autor do que a rodada automática grava. */
export const SYSTEM_ACTOR = 'sistema@acerola.local';

export type GithubSyncAllResult = {
  projects: number;
  prs: number;
  issues: number;
  failed: string[];
  message: string;
};
export const RESPONSIBLE_NOT_ATTENDANT =
  'O responsável escolhido não atende a área de Sistema. Escolha outro.';

@Injectable()
export class SoftwareProjectsService {
  constructor(
    private readonly repository: SoftwareProjectsRepository,
    private readonly timelineRepository: SoftwareTimelineRepository,
    private readonly githubService: GithubService,
    @Optional() private readonly assignees?: TicketAssigneesService,
  ) {}

  /**
   * Quem responde pelo sistema, conferido: precisa atender a área de Sistema, e o nome vem do
   * cadastro dela — nunca do corpo. `undefined` (o corpo não falou) passa adiante sem consulta.
   */
  private async resolveResponsible(
    responsibleId: string | null | undefined,
  ): Promise<ProjectResponsible | null | undefined> {
    if (responsibleId === undefined || responsibleId === null) return responsibleId;

    const attendant = await this.assignees?.resolve('sistema', responsibleId);
    if (!attendant) throw new UnprocessableEntityException(RESPONSIBLE_NOT_ATTENDANT);

    return { id: attendant.id, name: attendant.name };
  }

  async listTicketOptions(): Promise<{ id: number; name: string }[]> {
    return this.repository.listTicketOptions();
  }

  async isTicketOption(id: number): Promise<boolean> {
    return this.repository.isTicketOption(id);
  }

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
    assertCanEditSystem(user, 'cadastrar sistema');

    const responsible = await this.resolveResponsible(input.responsibleId);
    const row = await this.repository.insert(
      toSoftwareProjectInsert(input, user.email, responsible ?? null),
    );

    // Se o repositório for válido, dispara a sincronização inicial de PRs e issues em background
    const repoInfo = parseGitHubRepo(row.repositoryUrl);
    if (repoInfo) {
      void this.syncGithubSilently(row.id, repoInfo.owner, repoInfo.repo, user.email, user.id);
    }

    return toSoftwareProject(row, 0, 0);
  }

  async update(
    user: RequestUser,
    id: number,
    input: UpdateSoftwareProjectInput,
  ): Promise<SoftwareProject> {
    assertCanEditSystem(user, 'alterar sistema');

    await this.findById(user, id);

    const responsible = await this.resolveResponsible(input.responsibleId);
    const row = await this.repository.update(
      id,
      toSoftwareProjectUpdate(input, user.email, new Date(), responsible),
    );

    const [openTicketsMap, prsMap] = await Promise.all([
      this.repository.countOpenTicketsByProject([id]),
      this.repository.countPullRequestsByProject([id]),
    ]);

    return toSoftwareProject(row, openTicketsMap[id] ?? 0, prsMap[id] ?? 0);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanEditSystem(user, 'excluir sistema');

    await this.findById(user, id);
    await this.repository.remove(id);
  }

  async syncGithubPrs(user: RequestUser, id: number): Promise<{ synced: number; message: string }> {
    assertCanEditSystem(user, 'sincronizar PRs com GitHub');

    const repoInfo = repositoryOf(await this.findById(user, id));
    if (!repoInfo) {
      return { synced: 0, message: 'URL do GitHub não reconhecida.' };
    }

    const { prs, issues } = await this.syncRepository(id, repoInfo, user.email, user.id);

    return {
      synced: prs,
      message: `${prs} Pull Requests e ${issues} issues sincronizados com sucesso.`,
    };
  }

  /**
   * Sincroniza TODOS os sistemas de uma vez — PRs e issues, histórico inteiro.
   *
   * Só Super Administrador: são dezenas de chamadas ao GitHub numa tacada, e o limite da
   * instalação do App é da organização inteira, não de quem clicou.
   */
  async syncAllGithub(user: RequestUser): Promise<GithubSyncAllResult> {
    assertIsSuperAdmin(user.role, 'Sincronizar todos os sistemas');

    return this.syncAllProjects(user.email, user.id);
  }

  /**
   * A rodada automática da madrugada: só o que mudou desde `since`, em todos os sistemas.
   * Sem pessoa por trás — a autoria registrada é a do sistema.
   */
  async syncAllGithubSince(since: Date): Promise<GithubSyncAllResult> {
    return this.syncAllProjects(SYSTEM_ACTOR, undefined, since);
  }

  /**
   * Um sistema que falha (repositório fora da instalação, GitHub fora do ar) não impede os
   * outros: cada um é tentado, e a resposta diz quais ficaram para trás.
   */
  private async syncAllProjects(
    actorEmail: string,
    userId: string | undefined,
    since?: Date,
  ): Promise<GithubSyncAllResult> {
    const result: GithubSyncAllResult = { projects: 0, prs: 0, issues: 0, failed: [], message: '' };

    for (const project of await this.repository.listAll()) {
      const repoInfo = repositoryOf(project);
      if (!repoInfo) continue;
      try {
        const synced = await this.syncRepository(project.id, repoInfo, actorEmail, userId, since);
        result.projects++;
        result.prs += synced.prs;
        result.issues += synced.issues;
      } catch {
        result.failed.push(project.name);
      }
    }

    result.message = syncAllMessage(result);
    return result;
  }

  /** PRs e issues de um repositório para a timeline do sistema. Devolve quantos de cada. */
  private async syncRepository(
    projectId: number,
    repoInfo: { owner: string; repo: string },
    actorEmail: string,
    userId: string | undefined,
    since?: Date,
  ): Promise<{ prs: number; issues: number }> {
    const { owner, repo } = repoInfo;
    const prs = await this.githubService.fetchPullRequests(owner, repo, userId, since);
    await this.timelineRepository.upsertMany(
      prs.map((pr) => ({
        projectId,
        type: 'pr' as const,
        externalId: pr.externalId,
        title: pr.title,
        url: pr.url,
        author: pr.author,
        authorName: pr.authorName,
        status: pr.status,
        eventDate: pr.eventDate,
        createdBy: actorEmail,
      })),
    );

    const issues = await this.githubService.fetchIssues(owner, repo, userId, since);
    await this.timelineRepository.upsertMany(
      issues.map((issue) => ({ projectId, type: 'issue' as const, ...issue, createdBy: actorEmail })),
    );

    return { prs: prs.length, issues: issues.length };
  }

  /**
   * A primeira sincronização, logo depois do cadastro: PRs E issues, como o botão Sincronizar.
   * Sem as issues aqui, um sistema recém-cadastrado aparecia no cronograma só com os PRs até
   * alguém clicar em Sincronizar.
   */
  private async syncGithubSilently(
    projectId: number,
    owner: string,
    repo: string,
    actorEmail: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.syncRepository(projectId, { owner, repo }, actorEmail, userId);
    } catch {
      // Ignora erro em sincronização silenciosa de background
    }
  }
}

/** O repositório do sistema: as colunas já separadas, ou o que der para ler do endereço. */
function repositoryOf(project: {
  githubRepoOwner: string | null;
  githubRepoName: string | null;
  repositoryUrl: string;
}): { owner: string; repo: string } | null {
  if (project.githubRepoOwner && project.githubRepoName) {
    return { owner: project.githubRepoOwner, repo: project.githubRepoName };
  }

  return parseGitHubRepo(project.repositoryUrl);
}

function syncAllMessage(result: GithubSyncAllResult): string {
  const done = `${result.projects} sistemas sincronizados: ${result.prs} Pull Requests e ${result.issues} issues.`;
  if (!result.failed.length) return done;

  return `${done} Não foi possível sincronizar: ${result.failed.join(', ')}.`;
}
