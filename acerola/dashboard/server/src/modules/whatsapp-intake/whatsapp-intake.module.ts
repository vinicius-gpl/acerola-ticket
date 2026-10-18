import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { HistoryModule } from '../history/history.module';
import { TicketsModule } from '../tickets/tickets.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WhatsappIntakeController } from './controller/whatsapp-intake.controller';
import { WhatsappConversationsRepository } from './repository/whatsapp-conversations.repository';
import { WhatsappInboundMessagesRepository } from './repository/whatsapp-inbound-messages.repository';
import { WhatsappAccessRequestService } from './service/whatsapp-access-request.service';
import { WhatsappIntakeService } from './service/whatsapp-intake.service';

/**
 * Abrir chamado a partir do WhatsApp. É um módulo à parte porque junta os dois mundos — o WhatsApp e
 * os chamados — sem que um precise conhecer o outro.
 */
@Module({
  imports: [AuthModule, TicketsModule, WhatsappModule, HistoryModule],
  controllers: [WhatsappIntakeController],
  providers: [
    WhatsappIntakeService,
    WhatsappAccessRequestService,
    WhatsappConversationsRepository,
    WhatsappInboundMessagesRepository,
  ],
})
export class WhatsappIntakeModule {}
