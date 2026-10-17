import { describe, expect, it, vi } from 'vitest';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type Env } from '../../../lib/config/env.schema';
import { type WhatsappConversationRow } from '../../../lib/db/schema/whatsapp-conversations.schema';
import { type WhatsappConversationsRepository } from '../repository/whatsapp-conversations.repository';
import { type HistoryService } from '../../history/service/history.service';
import { type TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { type TicketsService } from '../../tickets/service/tickets.service';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { WhatsappAccessRequestService } from './whatsapp-access-request.service';
import { type InboundMessage } from './whatsapp-intake.service';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const SILENCE = { reply: null, isOpen: false };

const inbound = (text: string, extra: Partial<InboundMessage> = {}): InboundMessage => ({
  sessionId: 'a'.repeat(64),
  chatId: '5562999990002@s.whatsapp.net',
  text,
  phone: '5562999990002',
  ...extra,
});

function makeService(
  options: {
    areas?: string[];
    hasRoom?: boolean;
    createFails?: boolean;
    people?: { id: string; name: string; email: string }[];
    phoneOwners?: string[];
    searchFails?: boolean;
  } = {},
) {
  const assignees = {
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['sistema'] }),
  };
  const tickets = {
    phoneOwnersOf: vi.fn().mockResolvedValue(options.phoneOwners ?? []),
    create: vi.fn(async (input: { requesterName: string }, ..._rest: unknown[]) => {
      if (options.createFails) throw new Error('database down');

      return { id: 42, requesterName: input.requesterName };
    }),
  };
  const messaging = {
    reply: vi.fn(async (message: { kind: string; values: Record<string, string> }) =>
      options.hasRoom === false ? null : `text:${message.kind}`,
    ),
  };
  const env = { API_CORS_ORIGIN: 'http://localhost:5005', BOT_API_TOKEN: 't'.repeat(40) } as Env;
  /* O banco, de mentira: o mesmo contrato do repositório, guardado num Map. */
  const stored = new Map<string, WhatsappConversationRow>();
  const conversations = {
    find: vi.fn(async (key: string) => stored.get(key) ?? null),
    save: vi.fn(async (row: WhatsappConversationRow) => void stored.set(row.key, row)),
    remove: vi.fn(async (key: string) => void stored.delete(key)),
  };
  const directory = {
    searchUsers: vi.fn(async () => {
      if (options.searchFails) throw new Error('directory down');

      return options.people ?? [];
    }),
  };
  const history = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new WhatsappAccessRequestService(
    env,
    assignees as unknown as TicketAssigneesService,
    tickets as unknown as TicketsService,
    messaging as unknown as WhatsappMessagingService,
    conversations as unknown as WhatsappConversationsRepository,
    directory as unknown as UserDirectoryProvider,
    history as unknown as HistoryService,
  );

  /* Uma troca da conversa: a mensagem da pessoa e o que o bot respondeu. */
  const say = (text: string, extra: Partial<InboundMessage> = {}, now = NOW) =>
    service.handle('u-ana', inbound(text, extra), now);

  return { service, tickets, messaging, say, conversations, stored, directory, history };
}

const lastKind = (messaging: ReturnType<typeof makeService>['messaging']) =>
  messaging.reply.mock.calls.at(-1)?.[0].kind;

const MARIA = { id: 'maria-id', name: 'Maria Clara Souza', email: 'maria@empresa.com.br' };
const MARIA_LIMA = { id: 'lima-id', name: 'Maria Clara Lima', email: 'maria.lima@empresa.com.br' };

describe('WhatsappAccessRequestService — quem está pedindo', () => {
  // feliz
  it('recognizes the person by the name, skips the e-mail and links the ticket to them', async () => {
    const { say, tickets, history, directory } = makeService({ people: [MARIA, MARIA_LIMA] });

    await say('/acesso');
    expect(await say('Maria Clara Souza')).toEqual({
      reply: 'text:access_department',
      isOpen: true,
    });
    await say('11');

    expect(directory.searchUsers).toHaveBeenCalledWith('maria');
    expect(tickets.create.mock.calls[0]?.[0]).toMatchObject({ requesterName: 'Maria Clara Souza' });
    expect(tickets.create.mock.calls[0]?.[3]).toEqual({
      skipOpeningNotice: true,
      requester: { id: 'maria-id', email: 'maria@empresa.com.br', name: 'Maria Clara Souza' },
    });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tickets.create', actorId: null, targetId: '42' }),
    );
  });

  it('settles a shared name by who already used the phone', async () => {
    const { say, tickets } = makeService({ people: [MARIA, MARIA_LIMA], phoneOwners: ['lima-id'] });

    for (const text of ['/acesso', 'Maria Clara', '11']) await say(text);

    expect(tickets.phoneOwnersOf).toHaveBeenCalledWith('5562999990002');
    expect(tickets.create.mock.calls[0]?.[3]).toMatchObject({ requester: { id: 'lima-id' } });
  });

  it('asks who is who when the name fits several people, and links the one picked', async () => {
    const { say, tickets, messaging } = makeService({ people: [MARIA, MARIA_LIMA] });

    await say('/acesso');
    expect(await say('Maria Clara')).toEqual({ reply: 'text:access_who', isOpen: true });
    expect(messaging.reply.mock.calls.at(-1)?.[0].values.opcoes).toContain('2. Maria Clara Lima');
    expect(await say('2')).toEqual({ reply: 'text:access_department', isOpen: true });
    await say('11');

    expect(tickets.create.mock.calls[0]?.[3]).toMatchObject({ requester: { id: 'lima-id' } });
  });

  // triste
  it('goes on asking the e-mail, unlinked, when the person is none of them', async () => {
    const { say, tickets } = makeService({ people: [MARIA, MARIA_LIMA] });

    await say('/acesso');
    await say('Maria Clara');
    expect(await say('0')).toEqual({ reply: 'text:access_email', isOpen: true });
    for (const text of ['maria@outra.com', '11']) await say(text);

    expect(tickets.create.mock.calls[0]?.[3]).toEqual({
      skipOpeningNotice: true,
      requester: undefined,
    });
  });

  /* Diretório fora do ar não trava o pedido: só não há vínculo. */
  it('keeps the request going when the people search fails', async () => {
    const { say } = makeService({ searchFails: true });

    await say('/acesso');

    expect(await say('Maria Clara')).toEqual({ reply: 'text:access_email', isOpen: true });
  });
});

describe('WhatsappAccessRequestService', () => {
  // feliz
  it('asks name, e-mail and department, then opens the user request', async () => {
    const { say, tickets, messaging } = makeService();

    expect(await say('/acesso')).toEqual({ reply: 'text:access_name', isOpen: true });
    expect(await say('Maria Clara Souza')).toEqual({ reply: 'text:access_email', isOpen: true });
    expect(await say('Maria@Empresa.com.br')).toEqual({
      reply: 'text:access_department',
      isOpen: true,
    });
    expect(await say('11')).toEqual({ reply: 'text:access_created', isOpen: false });

    /* Pedido de usuário não é de sistema nenhum: o chamado nasce sem `projectId`. */
    expect(tickets.create.mock.calls[0]?.[0]).not.toHaveProperty('projectId');
    expect(tickets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterName: 'Maria Clara Souza',
        area: 'sistema',
        department: 'rh',
        problemType: 'access_request',
        contactPhone: '62999990002',
        notifyWhatsapp: true,
        assigneeId: 'u-ana',
        description: expect.stringContaining('E-mail: maria@empresa.com.br'),
      }),
      undefined,
      [],
      { skipOpeningNotice: true },
    );
    expect(messaging.reply.mock.calls.at(-1)?.[0]).toMatchObject({
      ticketId: 42,
      values: { nome: 'Maria', protocolo: 'CH-0042' },
    });
  });

  it('asks the phone only when WhatsApp hid it', async () => {
    const { say, messaging } = makeService();
    const hidden = { phone: null, chatId: '123@lid' };

    await say('/acesso', hidden);
    await say('Maria Clara', hidden);
    await say('maria@empresa.com.br', hidden);

    expect(lastKind(messaging)).toBe('access_phone');
  });

  /* Quem atende só Infra não vira responsável de pedido de Sistema: ele nasce na fila. */
  it('opens the ticket without assignee when the attendant does not attend Sistema', async () => {
    const { say, tickets } = makeService({ areas: ['infra'] });

    for (const text of ['/acesso', 'Maria Clara', 'm@empresa.com', '1']) await say(text);

    expect(tickets.create.mock.calls[0]?.[0]).toMatchObject({ assigneeId: undefined });
  });

  it('knows the messages of an open request, and only those', async () => {
    const { service, say } = makeService();

    expect(await service.isFor(inbound('oi'), NOW)).toBe(false);
    await say('/acesso');
    expect(await service.isFor(inbound('Maria Clara'), NOW)).toBe(true);
    expect(await service.isFor(inbound('Maria Clara'), NOW + 16 * MINUTE)).toBe(false);
  });

  /* O que importa da conversa no banco: um servidor novo (reinício) continua de onde parou. */
  it('picks up the request where it stopped after the server restarts', async () => {
    const { say, conversations, stored } = makeService();
    await say('/acesso');
    await say('Maria Clara Souza');
    expect(conversations.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        key: `${'a'.repeat(64)}:5562999990002@s.whatsapp.net`,
        draft: expect.objectContaining({ requesterName: 'Maria Clara Souza' }),
      }),
    );

    const restarted = makeService();
    for (const [key, row] of stored) restarted.stored.set(key, row);

    expect(await restarted.say('maria@empresa.com.br')).toEqual({
      reply: 'text:access_department',
      isOpen: true,
    });
  });

  // triste
  it('repeats the question when the answer is not valid, without moving on', async () => {
    const { say, messaging } = makeService();

    await say('/acesso');
    expect(await say('Maria')).toEqual({ reply: 'text:access_invalid', isOpen: true });
    expect(messaging.reply.mock.calls.at(-1)?.[0].values.erro).toContain('dois nomes');
    expect(await say('Maria Clara')).toEqual({ reply: 'text:access_email', isOpen: true });
  });

  it('goes silent and forgets the request when the person cancels', async () => {
    const { service, say } = makeService();

    await say('/acesso');
    expect(await say('cancelar')).toEqual(SILENCE);
    expect(await service.isFor(inbound('Maria Clara'), NOW)).toBe(false);
  });

  it('forgets a request left unanswered for too long', async () => {
    const { say } = makeService();

    await say('/acesso');

    expect(await say('Maria Clara', {}, NOW + 16 * MINUTE)).toEqual(SILENCE);
  });

  it('does not start when the attendant has no area', async () => {
    expect(await makeService({ areas: [] }).say('/acesso')).toEqual(SILENCE);
  });

  /* Teto do dia atingido: o bot se cala e a conversa fecha. */
  it('goes silent when the daily limit of the attendant is reached', async () => {
    const { service, say } = makeService({ hasRoom: false });

    expect(await say('/acesso')).toEqual(SILENCE);
    expect(await service.isFor(inbound('Maria Clara'), NOW)).toBe(false);
  });

  /* Calar deixaria a pessoa esperando uma resposta que não vem: ela fica sabendo. */
  it('tells the person when the ticket could not be saved', async () => {
    const { say } = makeService({ createFails: true });

    for (const text of ['/acesso', 'Maria Clara', 'm@empresa.com']) await say(text);

    expect(await say('1')).toEqual({ reply: 'text:access_invalid', isOpen: false });
  });

  /* Sem confirmar quem atende (diretório fora), é erro: o chamado não nasce pela metade. */
  it('does not open the ticket when the assignee cannot be confirmed, and says so', async () => {
    const { say, tickets } = makeService();
    tickets.create.mockRejectedValueOnce(new Error('directory down'));

    for (const text of ['/acesso', 'Maria Clara', 'm@empresa.com']) await say(text);

    expect(await say('1')).toEqual({ reply: 'text:access_invalid', isOpen: false });
    expect(tickets.create).toHaveBeenCalledTimes(1);
  });
});
