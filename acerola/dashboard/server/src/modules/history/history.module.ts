import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HistoryInterceptor } from './interceptor/history.interceptor';
import { HistoryRepository } from './repository/history.repository';
import { HistoryService } from './service/history.service';

/**
 * O histórico do sistema (ver `history.schema`). O interceptor é global: registra toda mudança
 * feita pela API. O `HistoryService` é exportado para o que muda dado fora de uma requisição
 * de pessoa — como o chamado que o bot do WhatsApp abre.
 */
@Module({
  providers: [
    HistoryRepository,
    HistoryService,
    { provide: APP_INTERCEPTOR, useClass: HistoryInterceptor },
  ],
  exports: [HistoryService],
})
export class HistoryModule {}
