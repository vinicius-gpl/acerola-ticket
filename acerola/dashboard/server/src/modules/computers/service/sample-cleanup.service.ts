import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { msUntilBrasiliaTime } from '@template/shared/domain/daily-schedule.util';

import { ComputersService, SAMPLE_RETENTION_DAYS } from './computers.service';

/**
 * 03:00 em Brasília (UTC−3): três horas depois da sincronização do GitHub da meia-noite, para as
 * duas rotinas pesadas da madrugada não disputarem o banco.
 */
export const SAMPLE_CLEANUP_HOUR = 3;

/**
 * Apaga, toda madrugada, as medições de uso mais velhas que a retenção.
 *
 * Só as medições (o gráfico). A ficha da máquina, os alertas, as manutenções e as peças ficam.
 */
@Injectable()
export class SampleCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SampleCleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly computers: ComputersService) {}

  onModuleInit(): void {
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer);
  }

  /** Uma rodada. Pública para poder ser testada sem esperar a madrugada. */
  async run(now = new Date()): Promise<void> {
    try {
      const deleted = await this.computers.deleteOldSamples(now);
      this.logger.log(
        `Sample cleanup finished: ${deleted} samples older than ${SAMPLE_RETENTION_DAYS} days deleted`,
      );
    } catch (error) {
      this.logger.error(`Sample cleanup failed: ${String(error)}`);
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.run().finally(() => this.scheduleNext());
    }, msUntilBrasiliaTime(new Date(), SAMPLE_CLEANUP_HOUR));
    /* O agendamento não pode segurar o processo vivo num desligamento. */
    this.timer.unref();
  }
}
