import { isLidUser, isPnUser, jidNormalizedUser, type WAMessage } from 'baileys';

import { phoneFromJid } from './whatsapp-phone.util.js';

/** Uma mensagem de texto que chegou numa conversa privada, pronta para a camada de conversa. */
export type PrivateText = {
  /** O endereço da conversa no WhatsApp — é para ele que a resposta volta. */
  chatId: string;
  text: string;
  /** O telefone de quem escreveu, quando dá para saber. */
  phone: string | null;
  /** O identificador da mensagem no WhatsApp — o servidor o usa para não ler a mesma duas vezes. */
  messageId: string | null;
};

/* Mensagem mais velha que isto não é respondida. Quando o bot volta de uma queda, o WhatsApp
   entrega de uma vez o que chegou enquanto ele estava fora: responder a esse lote seria uma
   rajada de mensagens automáticas — o comportamento que mais chama a atenção do WhatsApp — e
   uma resposta de horas atrás não ajuda ninguém. */
const MAX_MESSAGE_AGE_SECONDS = 120;

/**
 * O texto de uma mensagem que o bot PODE responder — ou nulo.
 *
 * O número vinculado é o WhatsApp pessoal de alguém, então o filtro é restritivo. Fica de fora:
 *  - o que a própria pessoa mandou para OUTRA pessoa (senão o bot responderia na conversa de
 *    qualquer um para quem ela digitasse o comando);
 *  - grupo, lista de transmissão, status e canal: o bot só fala em conversa privada;
 *  - o que não é texto (foto, áudio, figurinha);
 *  - mensagem antiga (ver `MAX_MESSAGE_AGE_SECONDS`).
 *
 * A exceção ao primeiro item é a conversa da pessoa COM ELA MESMA ("Mensagem para mim mesmo"):
 * ali não há mais ninguém, e é o jeito de quem vinculou testar o bot sem um segundo celular.
 * `ownChatIds` são os endereços dessa conversa.
 */
export function readPrivateText(
  message: WAMessage,
  nowSeconds: number,
  ownChatIds: readonly string[] = [],
): PrivateText | null {
  const chatId = message.key.remoteJid;
  if (!chatId || !isPrivateChat(chatId)) return null;
  if (message.key.fromMe && !ownChatIds.includes(jidNormalizedUser(chatId))) return null;
  if (!isRecent(message, nowSeconds)) return null;

  const text = textOf(message);

  /* Na conversa da pessoa com ela mesma, quem escreve É o número vinculado. */
  const phone = message.key.fromMe ? ownPhoneOf(ownChatIds) : phoneOf(message, chatId);

  return text ? { chatId, text, phone, messageId: message.key.id ?? null } : null;
}

/* Sem horário a mensagem conta como velha: na dúvida, o bot não responde. */
function isRecent(message: WAMessage, nowSeconds: number): boolean {
  return nowSeconds - Number(message.messageTimestamp ?? 0) <= MAX_MESSAGE_AGE_SECONDS;
}

/* Texto simples chega num campo; texto com link ou em resposta a outra mensagem, em outro. */
function textOf(message: WAMessage): string | null | undefined {
  return message.message?.conversation ?? message.message?.extendedTextMessage?.text;
}

/**
 * O telefone de quem escreveu. No endereço de telefone, é o próprio endereço. No anônimo
 * (`@lid`) o WhatsApp esconde o número de propósito; às vezes ele vem num campo à parte da
 * mensagem, e quando não vem é nulo — o formulário do chamado pergunta.
 */
function phoneOf(message: WAMessage, chatId: string): string | null {
  /* O Baileys 7 traz o endereço de telefone de uma conversa anônima em `remoteJidAlt`; o
     `senderPn` é o nome antigo do mesmo campo, mantido para mensagem já guardada. */
  const key = message.key as { remoteJidAlt?: string | null; senderPn?: string | null };
  const alternate = key.remoteJidAlt ?? key.senderPn;

  return phoneFromJid(isPnUser(chatId) ? chatId : alternate);
}

/* O telefone do número vinculado: entre os endereços dele, o que é de telefone (o outro é anônimo). */
function ownPhoneOf(ownChatIds: readonly string[]): string | null {
  return phoneFromJid(ownChatIds.find((id) => isPnUser(id)));
}

/* Conversa privada tem dois formatos de endereço: o do telefone e o identificador anônimo
   (`@lid`) que o WhatsApp passou a usar no lugar dele. */
function isPrivateChat(chatId: string): boolean {
  return Boolean(isPnUser(chatId) || isLidUser(chatId));
}

/**
 * Os endereços da conversa de alguém consigo mesmo: o do telefone e o anônimo (`@lid`), sem a
 * parte que identifica o aparelho.
 */
export function ownChatIdsOf(user: { id?: string; lid?: string } | undefined): string[] {
  return [user?.id, user?.lid].filter((id): id is string => Boolean(id)).map(jidNormalizedUser);
}
