import { Injectable, Logger } from '@nestjs/common';

import { type HistoryInsert } from '../../../lib/db/schema/history.schema';
import { HistoryRepository } from '../repository/history.repository';

/**
 * Grava uma linha no histórico do sistema.
 *
 * Falha aqui NÃO derruba quem chamou: a mudança já aconteceu, e devolver erro faria a pessoa
 * repetir uma ação que deu certo. O erro vai para o log.
 */
@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly repository: HistoryRepository) {}

  async record(entry: HistoryInsert): Promise<void> {
    try {
      await this.repository.insert(entry);
    } catch (error) {
      this.logger.error(
        `failed to record history for ${entry.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
