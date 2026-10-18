import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { msUntilBrasiliaTime } from '@template/shared/domain/daily-schedule.util';

import { SoftwareProjectsService } from './software-projects.service';

/** Meia-noite em Brasília (UTC−3): o dia de trabalho acabou, e o cronograma amanhece em dia. */
export const GITHUB_DAILY_SYNC_HOUR = 0;

/**
 * Quanto para trás a rodada olha. 48 horas, e não 24, de propósito: se o servidor estiver fora
 * do ar numa noite, a rodada seguinte cobre o buraco. Repetir o que já veio não duplica nada —
 * a gravação é por PR/issue, e só atualiza.
 */
export const GITHUB_DAILY_SYNC_LOOKBACK_MS = 48 * 60 * 60 * 1000;

/**
 * Sincroniza PRs e issues de todos os sistemas toda noite, sem ninguém clicar.
 *
 * Dentro do próprio servidor, e não num agendador do Coolify: funciona igual em homologação e
 * produção sem configurar nada fora do código, e sem dependência nova.
 */
@Injectable()
export class GithubDailySyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GithubDailySyncService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly projects: SoftwareProjectsService) {}

  onModuleInit(): void {
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer);
  }

  /** Uma rodada. Pública para poder ser testada sem esperar a meia-noite. */
  async run(now = new Date()): Promise<void> {
    const since = new Date(now.getTime() - GITHUB_DAILY_SYNC_LOOKBACK_MS);
    try {
      const result = await this.projects.syncAllGithubSince(since);
      this.logger.log(`Daily GitHub sync finished: ${result.message}`);
    } catch (error) {
      this.logger.error(`Daily GitHub sync failed: ${String(error)}`);
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.run().finally(() => this.scheduleNext());
    }, msUntilBrasiliaTime(new Date(), GITHUB_DAILY_SYNC_HOUR));
    /* O agendamento não pode segurar o processo vivo num desligamento. */
    this.timer.unref();
  }
}
