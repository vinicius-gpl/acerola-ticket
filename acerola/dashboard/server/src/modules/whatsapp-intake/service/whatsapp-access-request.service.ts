import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type AccessRequestDraft,
  type AccessRequestStep,
  accessRequestDescription,
  departmentOptionsText,
  emptyAccessRequest,
  fillAccessRequestStep,
  identifiedAs,
  isAccessRequestCancel,
  isAccessRequestCommand,
  nextAccessRequestStep,
} from '@template/shared/domain/access-request.util';
import {
  identifyPerson,
  nameTokens,
  type PersonCandidate,
  personOptionsText,
} from '@template/shared/domain/person-match.util';
import { invitePhoneForForm } from '@template/shared/domain/ticket-invite.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type WhatsappTemplateKey } from '@template/shared/domain/whatsapp-template.util';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { HistoryService } from '../../history/service/history.service';
import { TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { ticketAccessLink } from '../../tickets/service/ticket-whatsapp-notifier.service';
import { TicketsService } from '../../tickets/service/tickets.service';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { WhatsappConversationsRepository } from '../repository/whatsapp-conversations.repository';
import type { InboundMessage, InboundReply } from './whatsapp-intake.service';

type Conversation = {
  userId: string;
  attendantName: string;
  /* Só quem atende a área de Sistema vira responsável; senão o pedido nasce sem responsável,
     e a equipe de Sistema o pega na fila. */
  assigneeId: string | undefined;
  draft: AccessRequestDraft;
  expiresAt: number;
};

const SILENCE: InboundReply = { reply: null, isOpen: false };

/* Quanto tempo o bot espera cada resposta. O mesmo prazo que o bot dá à conversa aberta: depois
   disso, o que a pessoa escrever volta a ser conversa comum. */
const CONVERSATION_TTL_MS = 15 * 60 * 1000;

const QUESTION_TEMPLATES: Record<AccessRequestStep, WhatsappTemplateKey> = {
  name: 'access_name',
  who: 'access_who',
  email: 'access_email',
  phone: 'access_phone',
  department: 'access_department',
};

/**
 * PEDIDO DE USUÁRIO PELO WHATSAPP (`/acesso`), para quem ainda não tem conta.
 *
 * O bot pergunta um campo por mensagem e, com tudo respondido, abre UM chamado na área de
 * Sistema, tipo "Pedido de acesso", sem sistema — quem atende cria o usuário. A regra de cada
 * resposta mora em `access-request.util`; aqui fica a conversa: guardar o rascunho, mandar a
 * próxima pergunta e criar o chamado.
 *
 * O estado fica no banco (`whatsapp_conversations`): publicar uma versão nova do servidor no
 * meio de um pedido não faz a pessoa perder o que já respondeu.
 *
 * QUEM ESTÁ PEDINDO: depois do nome, o bot procura a conta da pessoa e desempata pelo
 * telefone (quem já abriu chamado com aquele número). Reconhecida, o chamado fica ligado à
 * conta dela, como o aberto pelo site; com várias possíveis, ele pergunta quem é quem.
 */
@Injectable()
export class WhatsappAccessRequestService {
  private readonly logger = new Logger(WhatsappAccessRequestService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly assignees: TicketAssigneesService,
    private readonly tickets: TicketsService,
    private readonly messaging: WhatsappMessagingService,
    private readonly conversations: WhatsappConversationsRepository,
    @Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider,
    private readonly history: HistoryService,
  ) {}

  /** Se a mensagem é desta conversa: o próprio comando, ou uma resposta a um pedido em aberto. */
  async isFor(message: InboundMessage, now: number): Promise<boolean> {
    if (isAccessRequestCommand(message.text)) return true;

    return ((await this.load(keyOf(message)))?.expiresAt ?? 0) > now;
  }

  /** Esquece o pedido em aberto daquela conversa — a pessoa mudou de assunto (ex.: `/chamado`). */
  async forget(message: InboundMessage): Promise<void> {
    await this.conversations.remove(keyOf(message));
  }

  async handle(userId: string, message: InboundMessage, now: number): Promise<InboundReply> {
    const key = keyOf(message);
    if (isAccessRequestCommand(message.text)) return this.start(userId, key, message, now);

    const conversation = await this.load(key);
    if (!conversation || conversation.expiresAt <= now || isAccessRequestCancel(message.text)) {
      await this.conversations.remove(key);

      return SILENCE;
    }

    return this.answer(key, conversation, message, now);
  }

  private async load(key: string): Promise<Conversation | null> {
    const row = await this.conversations.find(key);
    if (!row) return null;

    return {
      userId: row.userId,
      attendantName: row.attendantName,
      assigneeId: row.assigneeId ?? undefined,
      draft: row.draft,
      expiresAt: row.expiresAt.getTime(),
    };
  }

  private async start(
    userId: string,
    key: string,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    const attendant = await this.assignees.areasOf(userId);
    /* Vinculou o número mas não administra mais nenhuma área: não há chamado para abrir com ele. */
    if (!attendant || attendant.areas.length === 0) return SILENCE;

    const conversation: Conversation = {
      userId,
      attendantName: attendant.name,
      assigneeId: attendant.areas.includes('sistema') ? userId : undefined,
      draft: emptyAccessRequest(message.phone),
      expiresAt: now + CONVERSATION_TTL_MS,
    };

    return this.ask(key, conversation, message, 'name');
  }

  private async answer(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    /* Rascunho completo não fica guardado (ele vira chamado na hora); isto é só a garantia. */
    const step = nextAccessRequestStep(conversation.draft);
    if (!step) return SILENCE;

    const filled = fillAccessRequestStep(conversation.draft, step, message.text);
    const refreshed = { ...conversation, expiresAt: now + CONVERSATION_TTL_MS };
    if (!filled.ok)
      return this.say(key, refreshed, message, 'access_invalid', { erro: filled.error });

    const draft = step === 'name' ? await this.identify(filled.draft) : filled.draft;
    const next = { ...refreshed, draft };
    const nextStep = nextAccessRequestStep(draft);
    if (!nextStep) return this.finish(key, next, message);

    return this.ask(key, next, message, nextStep);
  }

  /* Quem é, pelo nome que acabou de chegar: uma pessoa vira vínculo, várias viram pergunta. */
  private async identify(draft: AccessRequestDraft): Promise<AccessRequestDraft> {
    const name = draft.requesterName ?? '';
    const [people, phoneOwners] = await Promise.all([
      this.peopleNamed(name),
      draft.phone ? this.tickets.phoneOwnersOf(draft.phone) : Promise.resolve([]),
    ]);
    const match = identifyPerson(name, people, phoneOwners);

    if (match.kind === 'one') return identifiedAs(draft, match.person);
    if (match.kind === 'many') return { ...draft, candidates: match.people };

    return draft;
  }

  /* Diretório fora do ar não trava o pedido: ele segue como antes, sem vínculo. */
  private async peopleNamed(name: string): Promise<PersonCandidate[]> {
    const [firstName] = nameTokens(name);
    if (!firstName) return [];

    try {
      const users = await this.directory.searchUsers(firstName);

      return users.map((user) => ({ id: user.id, name: user.name, email: user.email }));
    } catch {
      this.logger.warn('access request: could not search people in the user directory');

      return [];
    }
  }

  private async ask(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    step: AccessRequestStep,
  ): Promise<InboundReply> {
    return this.say(key, conversation, message, QUESTION_TEMPLATES[step], {
      responsavel: conversation.attendantName,
      nome: firstName(conversation.draft.requesterName),
      opcoes: optionsFor(step, conversation.draft),
    });
  }

  private async finish(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
  ): Promise<InboundReply> {
    await this.conversations.remove(key);

    const ticket = await this.createTicket(conversation);
    /* Nada foi registrado: a pessoa fica sabendo, em vez de esperar uma resposta que não vem. */
    if (!ticket) return this.sayFailed(conversation, message);

    await this.recordHistory(ticket, conversation.draft);

    const reply = await this.messaging.reply({
      senderUserId: conversation.userId,
      recipient: message.phone ?? message.chatId,
      kind: 'access_created',
      ticketId: ticket.id,
      values: {
        nome: firstName(ticket.requesterName),
        protocolo: formatTicketProtocol(ticket.id),
        link: ticketAccessLink(ticket.id, this.env),
      },
    });

    return { reply, isOpen: false };
  }

  private async sayFailed(
    conversation: Conversation,
    message: InboundMessage,
  ): Promise<InboundReply> {
    const reply = await this.messaging.reply({
      senderUserId: conversation.userId,
      recipient: message.phone ?? message.chatId,
      kind: 'access_invalid',
      ticketId: null,
      values: {
        erro: 'Não consegui registrar o seu pedido agora. Tente de novo em instantes com /acesso.',
      },
    });

    return { reply, isOpen: false };
  }

  /* Um chamado de Sistema SEM sistema: é o pedido de criar o usuário (ver `TicketsService`). */
  private async createTicket(
    conversation: Conversation,
  ): Promise<{ id: number; requesterName: string } | null> {
    const { requesterName, email, phone, department } = conversation.draft;
    if (!requesterName || !email || !phone || !department) return null;

    const contactPhone = invitePhoneForForm(phone);
    const input = {
      requesterName,
      area: 'sistema' as const,
      department,
      problemType: 'access_request' as const,
      priority: 'medium' as const,
      contactPhone,
      /* Quem pediu pela conversa já está no WhatsApp: é por lá que quer saber do pedido. */
      notifyWhatsapp: true,
      description: accessRequestDescription({ requesterName, email, phone: contactPhone }),
      assigneeId: conversation.assigneeId,
    };
    /* A confirmação já vai na própria conversa (`access_created`). */
    const options = { skipOpeningNotice: true, requester: requesterOf(conversation.draft) };

    /* Falhou (o diretório não confirmou quem atende, por exemplo): a pessoa recebe o aviso de
       erro em `finish`, e o motivo fica no log para quem administra. */
    return this.tickets.create(input, options).catch((error: unknown) => {
      this.logger.error(
        'failed to create user request from WhatsApp',
        error instanceof Error ? error.stack : '',
      );

      return null;
    });
  }

  /* O chamado nasceu fora de uma requisição de pessoa: o histórico é gravado aqui, sem autor —
     quem fez foi o bot. */
  private async recordHistory(ticket: { id: number }, draft: AccessRequestDraft): Promise<void> {
    await this.history.record({
      action: 'tickets.create',
      actorId: null,
      actorEmail: null,
      targetType: 'tickets',
      targetId: String(ticket.id),
      targetLabel: formatTicketProtocol(ticket.id),
      changes: [
        { field: 'source', from: null, to: 'whatsapp' },
        { field: 'problemType', from: null, to: 'access_request' },
        { field: 'requesterId', from: null, to: draft.requesterId ?? null },
      ],
    });
  }

  /* Uma resposta do bot: reserva no limite do dia, guarda o estado e mantém a conversa aberta.
     Sem espaço no limite, o bot se cala e a conversa fecha. */
  private async say(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    kind: WhatsappTemplateKey,
    values: Record<string, string>,
  ): Promise<InboundReply> {
    const text = await this.messaging.reply({
      senderUserId: conversation.userId,
      recipient: message.phone ?? message.chatId,
      kind,
      ticketId: null,
      values,
    });
    if (!text) {
      await this.conversations.remove(key);

      return SILENCE;
    }

    await this.conversations.save({
      key,
      userId: conversation.userId,
      attendantName: conversation.attendantName,
      assigneeId: conversation.assigneeId ?? null,
      draft: conversation.draft,
      expiresAt: new Date(conversation.expiresAt),
    });

    return { reply: text, isOpen: true };
  }
}

/* De qual número vinculado e de qual conversa — o mesmo par que o bot usa. */
function keyOf(message: InboundMessage): string {
  return `${message.sessionId}:${message.chatId}`;
}

/* A conta de quem pede, quando o bot a reconheceu; sem ela, o chamado nasce sem vínculo. */
function requesterOf(
  draft: AccessRequestDraft,
): { id: string; email: string; name: string } | undefined {
  if (!draft.requesterId || !draft.email || !draft.requesterName) return undefined;

  return { id: draft.requesterId, email: draft.email, name: draft.requesterName };
}

/* As opções numeradas que a pergunta mostra: as pessoas do "quem é você?" ou os setores. */
function optionsFor(step: AccessRequestStep, draft: AccessRequestDraft): string {
  if (step === 'who') return personOptionsText(draft.candidates ?? []);
  if (step === 'department') return departmentOptionsText();

  return '';
}

/* As mensagens chamam a pessoa pelo primeiro nome: "Obrigado, Maria!", não o nome inteiro. */
function firstName(name: string | null): string {
  return name?.split(' ')[0] ?? '';
}
