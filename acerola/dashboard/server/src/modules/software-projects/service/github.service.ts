import { Inject, Injectable, Logger, Optional, BadGatewayException } from '@nestjs/common';
import { GithubAppService } from '../../github-integration/service/github-app.service';
import { parseGitHubRepo } from '@template/shared/domain/software-project.util';
import { eq } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

export type FetchedPr = {
  externalId: string;
  title: string;
  url: string;
  author: string;
  authorName: string;
  status: 'open' | 'merged' | 'closed';
  eventDate: Date;
};

type RawGithubPr = {
  number: number;
  title: string;
  html_url: string;
  user?: { login?: string };
  state: string;
  merged_at?: string | null;
  created_at: string;
};

type RawGithubUser = { name?: string | null };

function resolvePrStatus(mergedAt?: string | null, state?: string): 'open' | 'merged' | 'closed' {
  if (mergedAt) return 'merged';
  if (state === 'closed') return 'closed';
  return 'open';
}

function mapRawPr(pr: RawGithubPr): FetchedPr {
  return {
    externalId: `#${pr.number}`,
    title: pr.title,
    url: pr.html_url,
    author: pr.user?.login ?? 'github',
    authorName: pr.user?.login ?? 'github',
    status: resolvePrStatus(pr.merged_at, pr.state),
    eventDate: new Date(pr.merged_at ?? pr.created_at),
  };
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly authorNames = new Map<string, Promise<string>>();

  constructor(
    @Inject(DB) private readonly db: Database,
    @Optional() private readonly app?: GithubAppService,
  ) {}

  private get token(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  private headers(token = this.token): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AcerolaTicket-Dashboard',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private authorName(login: string, token?: string): Promise<string> {
    const cached = this.authorNames.get(login);
    if (cached) return cached;

    const lookup = fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (response) => {
        if (!response.ok) return login;
        const user = (await response.json()) as RawGithubUser;
        return user.name?.trim() || login;
      })
      .catch(() => login);

    this.authorNames.set(login, lookup);
    return lookup;
  }

  private async addAuthorNames<T extends { author: string }>(
    items: T[],
    token?: string,
  ): Promise<(T & { authorName: string })[]> {
    const logins = [...new Set(items.map((item) => item.author))];
    const names = new Map<string, string>();
    let nextLogin = 0;
    await Promise.all(
      Array.from({ length: Math.min(8, logins.length) }, async () => {
        while (nextLogin < logins.length) {
          const login = logins[nextLogin++];
          if (login) names.set(login, await this.authorName(login, token));
        }
      }),
    );
    return items.map((item) => ({ ...item, authorName: names.get(item.author) ?? item.author }));
  }

  /**
   * Busca os Pull Requests de um repositório no GitHub.
   */
  async fetchPullRequests(owner: string, repo: string, userId?: string): Promise<FetchedPr[]> {
    const token = this.app ? await this.app.accessToken() : this.token;
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`;

    try {
      const response = await fetch(url, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return this.handlePrFetchFailure(response.status, owner, repo, userId);
      }

      const list = (await response.json()) as RawGithubPr[];
      await this.fetchSubsequentPrPages(url, token, response, list);
      return this.addAuthorNames(list.map(mapRawPr), token);
    } catch (error) {
      return this.handlePrCatchError(error, owner, repo, userId);
    }
  }

  private handlePrFetchFailure(
    status: number,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedPr[] {
    if (userId) {
      throw this.repositoryAccessError(status, owner, repo, 'Pull requests: read');
    }
    this.logger.warn(`GitHub API devolveu status ${status} ao buscar PRs de ${owner}/${repo}`);
    return [];
  }

  private async fetchSubsequentPrPages(
    url: string,
    token: string | undefined,
    initialResponse: Response,
    list: RawGithubPr[],
  ): Promise<void> {
    let response = initialResponse;
    for (let page = 2; response.headers?.get('link')?.includes('rel="next"'); page++) {
      response = await fetch(`${url}&page=${page}`, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new BadGatewayException('Não foi possível carregar todos os PRs do repositório.');
      }
      list.push(...((await response.json()) as RawGithubPr[]));
    }
  }

  private handlePrCatchError(
    error: unknown,
    owner: string,
    repo: string,
    userId?: string,
  ): FetchedPr[] {
    if (!userId) {
      this.logger.warn(
        `Falha na comunicação com o GitHub para PRs de ${owner}/${repo}: ${String(error)}`,
      );
      return [];
    }
    if (error instanceof BadGatewayException) throw error;
    throw new BadGatewayException('Não foi possível sincronizar com o GitHub. Tente novamente.');
  }

  async fetchIssues(owner: string, repo: string, userId?: string): Promise<FetchedPr[]> {
    const token = this.app ? await this.app.accessToken() : this.token;
    const items: FetchedPr[] = [];
    for (let page = 1; ; page++) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
        {
          headers: this.headers(token),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        throw this.issueFetchError(response.status, owner, repo, userId);
      }
      const rows = (await response.json()) as Array<{
        number: number;
        title: string;
        html_url: string;
        user?: { login?: string };
        state: string;
        pull_request?: unknown;
        created_at: string;
        closed_at?: string | null;
        closed_by?: { login?: string } | null;
      }>;
      const pageItems = rows
        .filter((row) => !row.pull_request)
        .map((row) => ({
          externalId: `#${row.number}`,
          title: row.title,
          url: row.html_url,
          author:
            row.state === 'closed'
              ? (row.closed_by?.login ?? 'github')
              : (row.user?.login ?? 'github'),
          status: row.state === 'closed' ? ('closed' as const) : ('open' as const),
          eventDate: new Date(
            row.state === 'closed' && row.closed_at ? row.closed_at : row.created_at,
          ),
        }));
      items.push(...(await this.addAuthorNames(pageItems, token)));
      if (!response.headers.get('link')?.includes('rel="next"')) return items;
    }
  }

  private issueFetchError(
    status: number,
    owner: string,
    repo: string,
    userId?: string,
  ): BadGatewayException {
    return userId
      ? this.repositoryAccessError(status, owner, repo, 'Issues: read')
      : new BadGatewayException('Não foi possível sincronizar as issues do repositório.');
  }

  private repositoryAccessError(
    status: number,
    owner: string,
    repo: string,
    permission: string,
  ): BadGatewayException {
    if (status === 404)
      return new BadGatewayException(
        `O GitHub App não tem acesso a ${owner}/${repo}. Inclua o repositório na instalação da organização e confirme as permissões do App.`,
      );
    if (status === 403)
      return new BadGatewayException(
        `A instalação do GitHub App não tem a permissão ${permission} para ${owner}/${repo}, ou a organização ainda precisa aprovar a atualização.`,
      );
    return new BadGatewayException(
      `O GitHub recusou a consulta de ${permission} para ${owner}/${repo} (HTTP ${status}).`,
    );
  }

  /**
   * Cria uma Issue no GitHub para um chamado.
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    accessToken = this.token,
  ): Promise<{ issueNumber: number; issueUrl: string } | null> {
    if (!accessToken) {
      this.logger.log(
        `GITHUB_TOKEN não configurado. Issue não criada no GitHub para ${owner}/${repo}.`,
      );
      return null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers(accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`GitHub API recusou criação de Issue (${response.status}): ${errorText}`);
        return null;
      }

      const json = (await response.json()) as { number: number; html_url: string };
      return {
        issueNumber: json.number,
        issueUrl: json.html_url,
      };
    } catch (error) {
      this.logger.warn(`Falha ao criar Issue no GitHub: ${String(error)}`);
      return null;
    }
  }

  /**
   * Sincroniza em SEGUNDO PLANO (background) um chamado recém-criado/vinculado, abrindo issue no GitHub.
   */
  syncTicketToIssueInBackground(
    ticketId: number,
    projectId: number,
    protocol: string,
    title: string,
    description: string,
    requesterName: string,
    _userId?: string,
  ): void {
    // Dispara promessa sem bloquear a resposta HTTP
    void (async () => {
      try {
        const [project] = await this.db
          .select()
          .from(softwareProjects)
          .where(eq(softwareProjects.id, projectId))
          .limit(1);

        if (!project) return;

        const repoInfo =
          project.githubRepoOwner && project.githubRepoName
            ? { owner: project.githubRepoOwner, repo: project.githubRepoName }
            : parseGitHubRepo(project.repositoryUrl);

        if (!repoInfo) return;

        const issueTitle = `[${protocol}] ${title}`;
        const issueBody = `### Chamado Aberto no Acerola Ticket\n\n**Protocolo:** ${protocol}\n**Solicitante:** ${requesterName}\n\n**Descrição:**\n${description}\n\n---\n*Gerado automaticamente em segundo plano via Acerola Ticket.*`;

        const token = this.app ? await this.app.accessToken() : this.token;
        const result = await this.createIssue(
          repoInfo.owner,
          repoInfo.repo,
          issueTitle,
          issueBody,
          token,
        );

        if (result) {
          // Atualiza o chamado com o link da issue
          await this.db
            .update(tickets)
            .set({
              githubIssueNumber: result.issueNumber,
              githubIssueUrl: result.issueUrl,
            })
            .where(eq(tickets.id, ticketId));

          // Grava o evento na timeline do projeto
          await this.db.insert(softwareTimelineEvents).values({
            projectId: project.id,
            type: 'issue',
            externalId: `#${result.issueNumber}`,
            title: `Issue #${result.issueNumber} criada para o chamado ${protocol}`,
            description: title,
            url: result.issueUrl,
            author: requesterName,
            authorName: requesterName,
            status: 'open',
            eventDate: new Date(),
            createdBy: 'sistema@acerola.local',
          });

          this.logger.log(
            `Issue #${result.issueNumber} criada com sucesso para o chamado ${protocol}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Erro ao sincronizar issue em background para o chamado ${ticketId}:`,
          err,
        );
      }
    })();
  }
}
