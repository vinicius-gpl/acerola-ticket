import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  signBotMessage,
  type WhatsappTemplateKey,
} from '@template/shared/domain/whatsapp-template.util';
import { whatsappAlertThreshold } from '@template/shared/schemas/whatsapp-connection.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';
import { toWhatsappNotice } from '../mapper/whatsapp-notices.mapper';
import { WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { BotClientService, type BotSendOutcome } from './bot-client.service';
import { isDiscardedAtLimit, WHATSAPP_QUEUE_TTL_MS } from './whatsapp-outbox.util';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

/** O desfecho de um envio: os do bot, mais os dois que o servidor decide antes de chamá-lo. */
export type WhatsappSendOutcome = BotSendOutcome | 'not_linked' | 'limit_reached';

/** O desfecho de pôr na fila: entrou, ou por que nem entrou. */
export type WhatsappQueueOutcome = 'queued' | 'not_configured' | 'not_linked' | 'limit_reached';

export type WhatsappUsage = { sentToday: number; dailyLimit: number };

export type WhatsappMessage = {
  /** De quem é o número que envia. */
  senderUserId: string;
  to: string;
  kind: WhatsappTemplateKey;
  values: Readonly<Record<string, string | null | undefined>>;
  ticketId: number | null;
};

/* O "dia" do limite é o de quem usa o sistema, não o do servidor (que roda em UTC). */
export const LIMIT_TIME_ZONE = 'America/Sao_Paulo';

/**
 * TODA mensagem automática passa por aqui — é o único lugar que conta e que trava. Os avisos
 * de chamado entram na fila (`queue`) e saem pelo entregador (`deliver`); as respostas da
 * conversa saem na hora, pelo bot (`reply`).
 *
 * O número é o pessoal de quem atende, e o WhatsApp bloqueia quem parece automação. Por isso
 * cada pessoa tem um teto diário: passou dele, o sistema para de enviar por ela até amanhã.
 * Perto do teto (70%), ela é avisada pelo próprio WhatsApp.
 */
@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly bot: BotClientService,
    private readonly connections: WhatsappConnectionsRepository,
    private readonly messages: WhatsappMessagesRepository,
    private readonly templates: WhatsappTemplatesService,
  ) {}

  async usage(userId: string): Promise<WhatsappUsage> {
    const sentToday = await this.messages.countSince(
      userId,
      startOfDay(new Date(), LIMIT_TIME_ZONE),
    );

    return { sentToday, dailyLimit: this.env.WHATSAPP_DAILY_LIMIT };
  }

  /** Há um número vinculado para esta pessoa? */
  async isLinked(userId: string): Promise<boolean> {
    return (await this.connections.find(userId)) !== null;
  }

  /**
   * Põe na FILA DE SAÍDA uma mensagem pelo número de alguém; quem entrega é o
   * `WhatsappOutboxService`, que tenta de novo enquanto não sai. Devolve `queued`, ou por que
   * nem entrou — o que já se sabe agora e não muda esperando (sem bot, sem vínculo).
   *
   * Limite do dia já atingido: o "recebi o seu chamado" nem entra (amanhã ele não faz mais
   * sentido); os outros entram, e o entregador os deixa para o dia seguinte.
   */
  async queue(message: WhatsappMessage, now: Date = new Date()): Promise<WhatsappQueueOutcome> {
    if (!this.bot.isConfigured) return 'not_configured';
    if (!(await this.isLinked(message.senderUserId))) return 'not_linked';
    if (isDiscardedAtLimit(message.kind) && !(await this.hasRoom(message.senderUserId))) {
      return 'limit_reached';
    }

    await this.messages.enqueue(
      {
        senderUserId: message.senderUserId,
        ticketId: message.ticketId,
        kind: message.kind,
        recipient: message.to,
        body: await this.signed(message.senderUserId, message.kind, message.values),
        expiresAt: new Date(now.getTime() + WHATSAPP_QUEUE_TTL_MS),
      },
      now,
    );

    return 'queued';
  }

  /**
   * Entrega UMA mensagem da fila — chamada pelo entregador. Confere de novo o vínculo e o
   * limite (podem ter mudado desde que ela entrou) e só então chama o bot. Saiu: marca como
   * enviada e confere o aviso de 70%. O que fazer com qualquer outro desfecho é do entregador.
   */
  async deliver(row: WhatsappMessageRow, now: Date = new Date()): Promise<WhatsappSendOutcome> {
    if (!(await this.isLinked(row.senderUserId))) return 'not_linked';
    if (!(await this.hasRoom(row.senderUserId))) return 'limit_reached';

    const outcome = await this.bot.sendText(row.senderUserId, row.recipient, row.body ?? '');
    if (outcome !== 'sent') return outcome;

    await this.messages.markSent(row.id, now);
    await this.alertNearLimit(row.senderUserId);

    return 'sent';
  }

  /** Os avisos de um chamado — saíram, estão na fila ou pararam, e por quê. */
  async notices(ticketId: number): Promise<WhatsappNotice[]> {
    const rows = await this.messages.listForTicket(ticketId);

    return rows.map(toWhatsappNotice).filter((notice) => notice !== null);
  }

  /** Põe de volta na fila um aviso que parou, com mais 1 dia de tentativas. Nulo: não dá. */
  async retry(
    ticketId: number,
    noticeId: number,
    now: Date = new Date(),
  ): Promise<WhatsappNotice | null> {
    const row = await this.messages.requeue(
      ticketId,
      noticeId,
      now,
      new Date(now.getTime() + WHATSAPP_QUEUE_TTL_MS),
    );

    return row ? toWhatsappNotice(row) : null;
  }

  /**
   * Reserva o envio de uma RESPOSTA que o próprio bot vai mandar (a conversa do /chamado): o
   * servidor só devolve o texto, e é o bot que o entrega. Devolve nulo quando o teto do dia já
   * foi atingido — e aí o bot fica em silêncio.
   */
  async reply(
    message: Omit<WhatsappMessage, 'to'> & { recipient: string },
  ): Promise<string | null> {
    if (!(await this.hasRoom(message.senderUserId))) return null;

    const text = await this.signed(message.senderUserId, message.kind, message.values);
    await this.count({ ...message, to: message.recipient });

    return text;
  }

  /* O texto do modelo, com a assinatura de quem atende no topo (ver `signBotMessage`). */
  private async signed(
    userId: string,
    kind: WhatsappTemplateKey,
    values: Readonly<Record<string, string | null | undefined>>,
  ): Promise<string> {
    const [body, name] = await Promise.all([
      this.templates.render(kind, values),
      this.operatorName(userId),
    ]);

    return signBotMessage(name, body);
  }

  /* O nome guardado no vínculo do número (ver `whatsapp_connections.operator_name`). */
  private async operatorName(userId: string): Promise<string> {
    return (await this.connections.find(userId))?.operatorName ?? '';
  }

  private async hasRoom(userId: string): Promise<boolean> {
    const { sentToday, dailyLimit } = await this.usage(userId);

    return sentToday < dailyLimit;
  }

  private async count(message: WhatsappMessage): Promise<void> {
    await this.messages.record({
      senderUserId: message.senderUserId,
      ticketId: message.ticketId,
      kind: message.kind,
      recipient: message.to,
    });

    await this.alertNearLimit(message.senderUserId);
  }

  private async alertNearLimit(userId: string): Promise<void> {
    const { sentToday, dailyLimit } = await this.usage(userId);
    /* Exatamente no limiar, e não "a partir dele": o aviso sai UMA vez por dia. */
    if (sentToday === whatsappAlertThreshold(dailyLimit)) {
      await this.alert(userId, sentToday, dailyLimit);
    }
  }

  /* O aviso vai para o próprio número da pessoa e NÃO conta no limite: contar faria o aviso
     gastar o que ele está avisando que acabou. */
  private async alert(userId: string, sentToday: number, dailyLimit: number): Promise<void> {
    const connection = await this.connections.find(userId);
    if (!connection) return;

    const text = await this.signed(userId, 'limit_alert', {
      enviadas: String(sentToday),
      limite: String(dailyLimit),
    });
    const outcome = await this.bot.sendText(userId, connection.phone, text);
    if (outcome !== 'sent') this.logger.warn(`limit alert not delivered: ${outcome}`);
  }
}

/**
 * A meia-noite de hoje num fuso, como instante. Feito pela diferença entre "que horas são lá"
 * e "que horas são em UTC", para não depender de biblioteca de data.
 */
export function startOfDay(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const secondsIntoDay = read('hour') * 3600 + read('minute') * 60 + read('second');

  return new Date(Math.floor(now.getTime() / 1000) * 1000 - secondsIntoDay * 1000);
}
