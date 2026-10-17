import { ForbiddenException, Injectable } from '@nestjs/common';
import { canLinkWhatsApp } from '@template/shared/domain/whatsapp-access.util';
import { type WhatsappConnection } from '@template/shared/schemas/whatsapp-connection.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { BotClientService, type BotStatus } from './bot-client.service';
import { WhatsappMessagingService } from './whatsapp-messaging.service';

export const WHATSAPP_LINK_FORBIDDEN_MESSAGE = 'Vincular o WhatsApp é uma ação de administrador.';

const DISCONNECTED: BotStatus = { state: 'disconnected', qr: null, phone: null };

/**
 * O vínculo do WhatsApp de quem está logado.
 *
 * Cada pessoa só enxerga e mexe no PRÓPRIO vínculo: o id vem sempre da identidade da
 * requisição, nunca do corpo nem do endereço — não existe rota para vincular, consultar ou
 * desvincular o número de outra pessoa.
 */
@Injectable()
export class WhatsappLinkService {
  constructor(
    private readonly bot: BotClientService,
    private readonly repository: WhatsappConnectionsRepository,
    private readonly messaging: WhatsappMessagingService,
  ) {}

  /**
   * A situação para a tela. Nunca falha por permissão: quem não pode vincular recebe
   * `canLink: false` e a tela simplesmente não oferece o botão.
   */
  async status(user: RequestUser): Promise<WhatsappConnection> {
    const canLink = canLinkWhatsApp(user);
    const usage = await this.messaging.usage(user.id);
    if (!this.bot.isConfigured || !canLink) {
      return { isConfigured: this.bot.isConfigured, canLink, ...DISCONNECTED, ...usage };
    }

    const status = await this.bot.status(user.id);
    await this.remember(user, status);

    return { isConfigured: true, canLink: true, ...status, ...usage };
  }

  /** Começa o vínculo: o bot passa a gerar o QR code, que a tela busca pela situação. */
  async link(user: RequestUser): Promise<WhatsappConnection> {
    assertCanLink(user);

    const status = await this.bot.link(user.id);
    await this.remember(user, status);

    return {
      isConfigured: true,
      canLink: true,
      ...status,
      ...(await this.messaging.usage(user.id)),
    };
  }

  async unlink(user: RequestUser): Promise<void> {
    assertCanLink(user);

    await this.bot.unlink(user.id);
    await this.repository.remove(user.id);
  }

  /**
   * Mantém a tabela igual ao que o bot diz. O bot é a verdade sobre a conexão; a tabela é a
   * cópia que o resto do sistema consulta sem precisar perguntar ao bot (quem tem número
   * vinculado, e qual).
   */
  private async remember(user: RequestUser, status: BotStatus): Promise<void> {
    const stored = await this.repository.find(user.id);

    if (status.state === 'connected' && status.phone) {
      /* O nome também: é a assinatura do bot, e o vínculo antigo nasceu sem ele. */
      const isCurrent = stored?.phone === status.phone && stored.operatorName === user.name;
      if (!isCurrent) await this.repository.save(user.id, status.phone, user.name);

      return;
    }

    /* Em `pairing` nada muda: é o meio do caminho, e ainda não há número. */
    if (status.state === 'disconnected' && stored) await this.repository.remove(user.id);
  }
}

function assertCanLink(user: RequestUser): void {
  if (!canLinkWhatsApp(user)) throw new ForbiddenException(WHATSAPP_LINK_FORBIDDEN_MESSAGE);
}
