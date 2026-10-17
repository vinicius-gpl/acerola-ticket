import { type WAMessage } from 'baileys';
import { describe, expect, it } from 'vitest';

import { ownChatIdsOf, readPrivateText } from './baileys-message.util.js';

const NOW = 1_800_000_000;
const PRIVATE_CHAT = '5562999990002@s.whatsapp.net';

function message(
  overrides: Partial<WAMessage> = {},
  key: Partial<WAMessage['key']> = {},
): WAMessage {
  return {
    key: { remoteJid: PRIVATE_CHAT, fromMe: false, id: 'ABC', ...key },
    messageTimestamp: NOW - 5,
    message: { conversation: '/chamado' },
    ...overrides,
  } as WAMessage;
}

describe('readPrivateText', () => {
  // feliz
  it('reads the text of a message from a private chat', () => {
    expect(readPrivateText(message(), NOW)).toEqual({
      chatId: PRIVATE_CHAT,
      text: '/chamado',
      phone: '5562999990002',
      messageId: 'ABC',
    });
  });

  /* Texto com link ou resposta a outra mensagem chega neste outro campo. */
  it('reads the text of an extended message', () => {
    const extended = message({ message: { extendedTextMessage: { text: '/chamado' } } });

    expect(readPrivateText(extended, NOW)?.text).toBe('/chamado');
  });

  /* No endereço anônimo o número só existe se o WhatsApp o mandar à parte. */
  it('takes the phone from the separate field of an anonymous address, when there is one', () => {
    const withPhone = message({}, {
      remoteJid: '123456789012345@lid',
      senderPn: '5562999990003@s.whatsapp.net',
    } as never);
    const withoutPhone = message({}, { remoteJid: '123456789012345@lid' });

    expect(readPrivateText(withPhone, NOW)?.phone).toBe('5562999990003');
    expect(readPrivateText(withoutPhone, NOW)?.phone).toBeNull();
  });

  /* Baileys 7: o mesmo número chega no campo `remoteJidAlt`. */
  it('takes the phone from the alternate address the current library sends', () => {
    const withPhone = message({}, {
      remoteJid: '123456789012345@lid',
      remoteJidAlt: '5562999990004@s.whatsapp.net',
    } as never);

    expect(readPrivateText(withPhone, NOW)?.phone).toBe('5562999990004');
  });

  it('accepts the anonymous address WhatsApp uses in place of the phone', () => {
    const fromLid = message({}, { remoteJid: '123456789012345@lid' });

    expect(readPrivateText(fromLid, NOW)?.chatId).toBe('123456789012345@lid');
  });

  /* "Mensagem para mim mesmo": não há mais ninguém na conversa, e é como quem vinculou testa. */
  it('reads what the linked person wrote to their own number', () => {
    const own = ['5562999990001@s.whatsapp.net', '999888777@lid'];
    const toSelf = message({}, { fromMe: true, remoteJid: '5562999990001@s.whatsapp.net' });
    const toSelfByLid = message({}, { fromMe: true, remoteJid: '999888777@lid' });

    expect(readPrivateText(toSelf, NOW, own)?.text).toBe('/chamado');
    expect(readPrivateText(toSelfByLid, NOW, own)?.text).toBe('/chamado');
    /* Quem escreve é o próprio número vinculado — mesmo quando a conversa usa o endereço
       anônimo, o telefone sai do endereço de telefone dele. */
    expect(readPrivateText(toSelf, NOW, own)?.phone).toBe('5562999990001');
    expect(readPrivateText(toSelfByLid, NOW, own)?.phone).toBe('5562999990001');
  });

  // triste
  /* Senão o bot responderia na conversa de qualquer pessoa para quem ela digitasse o comando. */
  it('ignores what the linked person sent to someone else', () => {
    const own = ['5562999990001@s.whatsapp.net'];

    expect(readPrivateText(message({}, { fromMe: true }), NOW)).toBeNull();
    expect(readPrivateText(message({}, { fromMe: true }), NOW, own)).toBeNull();
  });

  it('ignores groups, broadcast lists, status and channels', () => {
    for (const remoteJid of [
      '120363000000000000@g.us',
      '5562999990002@broadcast',
      'status@broadcast',
      '120363000000000000@newsletter',
    ]) {
      expect(readPrivateText(message({}, { remoteJid }), NOW)).toBeNull();
    }
  });

  it('ignores what is not text', () => {
    expect(readPrivateText(message({ message: { imageMessage: {} } }), NOW)).toBeNull();
    expect(readPrivateText(message({ message: undefined }), NOW)).toBeNull();
    expect(readPrivateText(message({ message: { conversation: '' } }), NOW)).toBeNull();
  });

  /* O que chegou enquanto o bot estava fora do ar não é respondido em lote na volta. */
  it('ignores a message that is too old, or has no time at all', () => {
    expect(readPrivateText(message({ messageTimestamp: NOW - 121 }), NOW)).toBeNull();
    expect(readPrivateText(message({ messageTimestamp: undefined }), NOW)).toBeNull();
    expect(readPrivateText(message({ messageTimestamp: NOW - 120 }), NOW)).not.toBeNull();
  });

  it('ignores a message without a chat address (edge case)', () => {
    expect(readPrivateText(message({}, { remoteJid: undefined }), NOW)).toBeNull();
  });
});

describe('ownChatIdsOf', () => {
  // feliz
  it('drops the device part of the phone and anonymous addresses', () => {
    expect(
      ownChatIdsOf({ id: '5562999990001:12@s.whatsapp.net', lid: '999888777:12@lid' }),
    ).toEqual(['5562999990001@s.whatsapp.net', '999888777@lid']);
  });

  // triste
  it('answers an empty list while the session has no identity yet', () => {
    expect(ownChatIdsOf(undefined)).toEqual([]);
    expect(ownChatIdsOf({})).toEqual([]);
  });
});
