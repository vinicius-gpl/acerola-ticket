import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';
import { type WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { type WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { type BotClientService } from './bot-client.service';
import { startOfDay, WhatsappMessagingService } from './whatsapp-messaging.service';
import { type WhatsappTemplatesService } from './whatsapp-templates.service';

const NOW = new Date('2026-10-14T15:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const message = {
  senderUserId: 'u-ana',
  to: '5562999990002',
  kind: 'ticket_ready' as const,
  values: { nome: 'Bia' },
  ticketId: 7,
};

function queued(overrides: Partial<WhatsappMessageRow> = {}): WhatsappMessageRow {
  return {
    id: 4,
    senderUserId: 'u-ana',
    ticketId: 7,
    kind: 'ticket_ready',
    recipient: '5562999990002',
    status: 'pending',
    body: 'text:ticket_ready',
    attempts: 1,
    nextAttemptAt: NOW,
    expiresAt: new Date(NOW.getTime() + DAY_MS),
    sentAt: null,
    failureReason: null,
    createdAt: NOW,
    ...overrides,
  };
}

function makeService(
  options: {
    operatorName?: string | null;
    sent?: number;
    limit?: number;
    linked?: boolean;
    outcome?: string;
    isConfigured?: boolean;
    requeued?: WhatsappMessageRow | null;
  } = {},
) {
  let sent = options.sent ?? 0;
  const bot = {
    isConfigured: options.isConfigured ?? true,
    sendText: vi.fn().mockResolvedValue(options.outcome ?? 'sent'),
  };
  const connections = {
    find: vi.fn().mockResolvedValue(
      options.linked === false
        ? null
        : {
            userId: 'u-ana',
            phone: '5562999990001',
            operatorName: options.operatorName === undefined ? 'Ana Lima' : options.operatorName,
          },
    ),
  };
  const messages = {
    countSince: vi.fn(async () => sent),
    record: vi.fn(async () => void (sent += 1)),
    enqueue: vi.fn(async () => undefined),
    markSent: vi.fn(async () => void (sent += 1)),
    listForTicket: vi.fn(async () => [queued(), queued({ id: 5, kind: 'access_created' })]),
    requeue: vi.fn(async () => (options.requeued === undefined ? queued() : options.requeued)),
  };
  const templates = { render: vi.fn(async (kind: string) => `text:${kind}`) };
  const service = new WhatsappMessagingService(
    { WHATSAPP_DAILY_LIMIT: options.limit ?? 100 } as Env,
    bot as unknown as BotClientService,
    connections as unknown as WhatsappConnectionsRepository,
    messages as unknown as WhatsappMessagesRepository,
    templates as unknown as WhatsappTemplatesService,
  );

  return { service, bot, messages, templates };
}

describe('WhatsappMessagingService.queue', () => {
  // feliz
  /* Entrar na fila é só gravar: o bot não é chamado aqui — quem entrega é o entregador. */
  it('puts the rendered text in the outbox, valid for one day, without calling the bot', async () => {
    const { service, bot, messages } = makeService();

    expect(await service.queue(message, NOW)).toBe('queued');
    expect(bot.sendText).not.toHaveBeenCalled();
    expect(messages.enqueue).toHaveBeenCalledWith(
      {
        senderUserId: 'u-ana',
        ticketId: 7,
        kind: 'ticket_ready',
        recipient: '5562999990002',
        body: '*Ana Lima BOT*\n\ntext:ticket_ready',
        expiresAt: new Date(NOW.getTime() + DAY_MS),
      },
      NOW,
    );
  });

  /* "Chamado pronto" com o dia esgotado entra mesmo assim: o entregador o deixa para amanhã. */
  it('queues the ready notice even when the day is over the limit', async () => {
    const { service, messages } = makeService({ sent: 100 });

    expect(await service.queue(message, NOW)).toBe('queued');
    expect(messages.enqueue).toHaveBeenCalledOnce();
  });

  // triste
  /* "Recebi o seu chamado" amanhã não diz nada: com o dia esgotado, nem entra. */
  it('does not queue the opening notice once the daily limit is reached', async () => {
    const { service, messages } = makeService({ sent: 100 });

    expect(await service.queue({ ...message, kind: 'ticket_opened' }, NOW)).toBe('limit_reached');
    expect(messages.enqueue).not.toHaveBeenCalled();
  });

  it('says so when the sender has no linked number, or there is no bot', async () => {
    expect(await makeService({ linked: false }).service.queue(message)).toBe('not_linked');
    expect(await makeService({ isConfigured: false }).service.queue(message)).toBe(
      'not_configured',
    );
  });
});

describe('WhatsappMessagingService.deliver', () => {
  // feliz
  it('sends the queued text through the bot and marks it sent', async () => {
    const { service, bot, messages } = makeService();

    expect(await service.deliver(queued(), NOW)).toBe('sent');
    expect(bot.sendText).toHaveBeenCalledWith('u-ana', '5562999990002', 'text:ticket_ready');
    expect(messages.markSent).toHaveBeenCalledWith(4, NOW);
  });

  /* Na 70ª mensagem do dia, a pessoa é avisada pelo próprio número — e o aviso não conta. */
  it('alerts the sender on their own number when the day reaches 70% of the limit', async () => {
    const { service, bot, messages } = makeService({ sent: 69 });

    await service.deliver(queued(), NOW);

    expect(bot.sendText).toHaveBeenLastCalledWith(
      'u-ana',
      '5562999990001',
      '*Ana Lima BOT*\n\ntext:limit_alert',
    );
    expect(messages.markSent).toHaveBeenCalledTimes(1);
  });

  it('alerts only once: the next message goes without another warning', async () => {
    const { service, bot } = makeService({ sent: 70 });

    await service.deliver(queued(), NOW);

    expect(bot.sendText).toHaveBeenCalledTimes(1);
  });

  // triste
  /* O limite é conferido de novo na entrega: a fila não fura o teto do dia. */
  it('does not send once the daily limit is reached', async () => {
    const { service, bot, messages } = makeService({ sent: 100 });

    expect(await service.deliver(queued(), NOW)).toBe('limit_reached');
    expect(bot.sendText).not.toHaveBeenCalled();
    expect(messages.markSent).not.toHaveBeenCalled();
  });

  it('does not mark as sent a message the bot could not deliver', async () => {
    const { service, messages } = makeService({ outcome: 'not_connected' });

    expect(await service.deliver(queued(), NOW)).toBe('not_connected');
    expect(messages.markSent).not.toHaveBeenCalled();
  });

  it('says so when the sender unlinked the number after the message was queued', async () => {
    const { service, bot } = makeService({ linked: false });

    expect(await service.deliver(queued(), NOW)).toBe('not_linked');
    expect(bot.sendText).not.toHaveBeenCalled();
  });
});

describe('WhatsappMessagingService.notices', () => {
  // feliz
  it('lists the ticket notices, leaving out conversation replies', async () => {
    const notices = await makeService().service.notices(7);

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ id: 4, kind: 'ticket_ready', status: 'pending' });
  });

  // triste
  it('lists nothing for a ticket without notices', async () => {
    const { service, messages } = makeService();
    messages.listForTicket.mockResolvedValueOnce([]);

    expect(await service.notices(7)).toEqual([]);
  });
});

describe('WhatsappMessagingService.retry', () => {
  // feliz
  it('puts a stopped notice back in the queue with one more day', async () => {
    const { service, messages } = makeService();

    expect(await service.retry(7, 4, NOW)).toMatchObject({ id: 4, status: 'pending' });
    expect(messages.requeue).toHaveBeenCalledWith(7, 4, NOW, new Date(NOW.getTime() + DAY_MS));
  });

  // triste
  it('answers null when the notice did not stop (queued or already sent)', async () => {
    expect(await makeService({ requeued: null }).service.retry(7, 4, NOW)).toBeNull();
  });
});

describe('WhatsappMessagingService.reply', () => {
  const reply = {
    senderUserId: 'u-ana',
    recipient: '5562999990002',
    kind: 'intake_link' as const,
    values: {},
    ticketId: null,
  };

  // feliz
  it('hands back the text and counts it, leaving the delivery to the bot', async () => {
    const { service, bot, messages } = makeService();

    expect(await service.reply(reply)).toBe('*Ana Lima BOT*\n\ntext:intake_link');
    expect(messages.record).toHaveBeenCalledOnce();
    expect(bot.sendText).not.toHaveBeenCalled();
  });

  // triste
  it('answers null, and counts nothing, once the daily limit is reached', async () => {
    const { service, messages } = makeService({ sent: 100 });

    expect(await service.reply(reply)).toBeNull();
    expect(messages.record).not.toHaveBeenCalled();
  });
});

describe('WhatsappMessagingService.usage', () => {
  // feliz
  it('tells how many went out today against the limit', async () => {
    expect(await makeService({ sent: 12, limit: 50 }).service.usage('u-ana')).toEqual({
      sentToday: 12,
      dailyLimit: 50,
    });
  });
});

describe('startOfDay', () => {
  // feliz
  /* 15h em Brasília (18h UTC): o dia começou às 03h UTC. */
  it('finds the midnight of the day in the given time zone', () => {
    const now = new Date('2026-10-10T18:30:45.000Z');

    expect(startOfDay(now, 'America/Sao_Paulo').toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });

  // triste
  /* 01h UTC ainda é "ontem" em Brasília (22h): o dia de lá começou no dia anterior de UTC. */
  it('does not use the UTC day when the zone is still on the day before', () => {
    const now = new Date('2026-10-11T01:00:00.000Z');

    expect(startOfDay(now, 'America/Sao_Paulo').toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });
});

describe('WhatsappMessagingService — assinatura do bot', () => {
  const reply = {
    senderUserId: 'u-ana',
    recipient: '5562999990002',
    kind: 'intake_link' as const,
    ticketId: null,
    values: {},
  };

  // feliz
  it('signs every message with the name of who attends', async () => {
    const { service } = makeService();

    expect(await service.reply(reply)).toBe('*Ana Lima BOT*\n\ntext:intake_link');
  });

  // triste
  /* Vínculo antigo, de antes de o nome ser guardado: sai assinada com o nome da casa. */
  it('still signs the message when the link has no name yet', async () => {
    const { service } = makeService({ operatorName: null });

    expect(await service.reply(reply)).toBe('*Acerola BOT*\n\ntext:intake_link');
  });
});
