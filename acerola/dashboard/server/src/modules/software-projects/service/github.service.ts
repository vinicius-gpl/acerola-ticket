import { Inject, Injectable, Logger } from '@nestjs/common';
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
  status: 'open' | 'merged' | 'closed';
  eventDate: Date;
};

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  private get token(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AcerolaTicket-Dashboard',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Busca os Pull Requests de um repositório no GitHub.
   */
  async fetchPullRequests(owner: string, repo: string): Promise<FetchedPr[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`;
    try {
      const response = await fetch(url, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`GitHub API devolveu status ${response.status} ao buscar PRs de ${owner}/${repo}`);
        return [];
      }

      const list = (await response.json()) as Array<{
        number: number;
        title: string;
        html_url: string;
        user?: { login?: string };
        state: string;
        merged_at?: string | null;
        created_at: string;
      }>;

      return list.map((pr) => {
        let status: 'open' | 'merged' | 'closed' = 'open';
        if (pr.merged_at) {
          status = 'merged';
        } else if (pr.state === 'closed') {
          status = 'closed';
        }

        return {
          externalId: `#${pr.number}`,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login ?? 'github',
          status,
          eventDate: new Date(pr.merged_at ?? pr.created_at),
        };
      });
    } catch (error) {
      this.logger.warn(`Falha na comunicação com o GitHub para PRs de ${owner}/${repo}: ${String(error)}`);
      return [];
    }
  }

  /**
   * Cria uma Issue no GitHub para um chamado.
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<{ issueNumber: number; issueUrl: string } | null> {
    if (!this.token) {
      this.logger.log(`GITHUB_TOKEN não configurado. Issue não criada no GitHub para ${owner}/${repo}.`);
      return null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers(),
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

        const result = await this.createIssue(
          repoInfo.owner,
          repoInfo.repo,
          issueTitle,
          issueBody,
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
            status: 'open',
            eventDate: new Date(),
            createdBy: 'sistema@acerola.local',
          });

          this.logger.log(`Issue #${result.issueNumber} criada com sucesso para o chamado ${protocol}`);
        }
      } catch (err) {
        this.logger.error(`Erro ao sincronizar issue em background para o chamado ${ticketId}:`, err);
      }
    })();
  }
}
