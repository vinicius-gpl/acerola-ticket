import { createHash } from 'node:crypto';

import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type WhatsappLinkState,
  whatsappLinkStateSchema,
} from '@template/shared/schemas/whatsapp-connection.schema';
import { z } from 'zod';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';

/** O que o bot responde sobre um vínculo. */
const botStatusSchema = z.object({
  state: whatsappLinkStateSchema,
  qr: z.string().nullable(),
  phone: z.string().nullable(),
});

export type BotStatus = { state: WhatsappLinkState; qr: string | null; phone: string | null };

/* O bot fica na mesma máquina ou na mesma rede interna: se não respondeu em poucos segundos,
   está fora do ar — e a tela não pode ficar pendurada esperando. */
const BOT_TIMEOUT_MS = 8000;

/**
 * O que aconteceu com um envio:
 *   sent                 o bot aceitou a mensagem
 *   not_configured       esta instalação não tem o bot
 *   not_connected        a pessoa não tem número vinculado, ou ele está desconectado
 *   recipient_not_found  o destino não tem WhatsApp
 *   failed               qualquer outra falha (bot fora do ar, erro interno)
 */
export type BotSendOutcome =
  'sent' | 'not_configured' | 'not_connected' | 'recipient_not_found' | 'failed';

/* O código HTTP do bot diz o desfecho (ver `bot/src/lib/http/bot-server.util.ts`). */
const SEND_OUTCOMES: Record<number, BotSendOutcome> = {
  202: 'sent',
  409: 'not_connected',
  422: 'recipient_not_found',
};

export const BOT_NOT_CONFIGURED_MESSAGE =
  'A integração com o WhatsApp ainda não foi configurada. Solicite a configuração ao administrador.';
export const BOT_UNAVAILABLE_MESSAGE =
  'Não consegui falar com o serviço de WhatsApp. Tente de novo em instantes.';

/**
 * A ÚNICA porta do servidor para o WhatsApp: tudo passa pela API HTTP do bot.
 *
 * O servidor não conhece o Baileys nem o protocolo do WhatsApp — só este contrato. É ele que
 * continua valendo no dia em que o bot passar a usar a API oficial.
 */
const DEFAULT_BOT_API_URL = 'http://127.0.0.1:4005';

@Injectable()
export class BotClientService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get isConfigured(): boolean {
    return Boolean(this.env.BOT_API_TOKEN);
  }

  status(userId: string): Promise<BotStatus> {
    return this.request(userId, 'GET', '').then(parseStatus);
  }

  link(userId: string): Promise<BotStatus> {
    return this.request(userId, 'POST', '/link').then(parseStatus);
  }

  async unlink(userId: string): Promise<void> {
    await this.request(userId, 'DELETE', '');
  }

  /**
   * Manda um texto pelo número de `userId`. NUNCA lança: devolve o que aconteceu, porque quem
   * chama quase sempre tem um plano B (o link manual) e uma mensagem que não saiu não pode
   * derrubar a abertura de um chamado.
   */
  async sendText(userId: string, to: string, text: string): Promise<BotSendOutcome> {
    if (!this.isConfigured) return 'not_configured';

    const response = await fetch(this.urlFor(userId, '/messages'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.BOT_API_TOKEN!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, text }),
      signal: AbortSignal.timeout(BOT_TIMEOUT_MS),
    }).catch(() => null);

    return SEND_OUTCOMES[response?.status ?? 0] ?? 'failed';
  }

  private urlFor(userId: string, action: string): string {
    const baseUrl = (this.env.BOT_API_URL || DEFAULT_BOT_API_URL).replace(/\/+$/, '');

    return `${baseUrl}/sessions/${botSessionId(userId)}${action}`;
  }

  private async request(userId: string, method: string, action: string): Promise<unknown> {
    if (!this.isConfigured) throw new ServiceUnavailableException(BOT_NOT_CONFIGURED_MESSAGE);

    const response = await fetch(this.urlFor(userId, action), {
      method,
      headers: { Authorization: `Bearer ${this.env.BOT_API_TOKEN!}` },
      signal: AbortSignal.timeout(BOT_TIMEOUT_MS),
    }).catch(() => null);

    /* O motivo de verdade (rede, token recusado, erro do bot) não vai para a tela: ele não
       ajuda quem está no perfil e pode carregar detalhe interno. */
    if (!response?.ok) throw new BadGatewayException(BOT_UNAVAILABLE_MESSAGE);

    return response.status === 204 ? null : response.json().catch(() => null);
  }
}

function parseStatus(body: unknown): BotStatus {
  const status = botStatusSchema.safeParse(body);
  if (!status.success) throw new BadGatewayException(BOT_UNAVAILABLE_MESSAGE);

  return status.data;
}

/**
 * O nome da sessão no bot: o hash do id do usuário.
 *
 * O bot usa esse nome como pasta em disco e só aceita letras, números, `_` e `-`. O id que o
 * autenticador entrega não promete esse alfabeto; o hash sempre cabe, e de quebra o bot nunca
 * fica sabendo o id de ninguém.
 */
export function botSessionId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}
