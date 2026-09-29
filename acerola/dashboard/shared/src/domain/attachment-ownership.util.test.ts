import { describe, expect, it } from 'vitest';

import {
  canRemoveAttachment,
  kindsUsedBy,
  onlyFrom,
  refuseAttachmentRemoval,
} from './attachment-ownership.util';

describe('canRemoveAttachment', () => {
  // feliz
  it('lets each side remove what is its own', () => {
    expect(canRemoveAttachment('support', 'support')).toBe(true);
    expect(canRemoveAttachment('requester', 'requester')).toBe(true);
  });

  // triste
  /**
   * A REGRA INTEIRA ESTÁ NESTE TESTE.
   *
   * Apagar o print de quem pediu socorro e depois dizer "não recebi print nenhum" é uma
   * história que o sistema não pode deixar acontecer, nem por engano de clique.
   */
  it('never lets the support side remove what the requester sent', () => {
    expect(canRemoveAttachment('requester', 'support')).toBe(false);
  });

  it('never lets the requester remove what the support side attached', () => {
    expect(canRemoveAttachment('support', 'requester')).toBe(false);
  });
});

describe('refuseAttachmentRemoval', () => {
  // feliz
  it('does not refuse what belongs to whoever is asking', () => {
    expect(refuseAttachmentRemoval('support', 'support')).toBeNull();
  });

  // triste
  /* A mensagem diz O QUE É o arquivo e o que ainda dá para fazer com ele: quem clicou precisa
     entender a recusa sem perguntar a ninguém. */
  it('says whose file it is when the support side tries to remove the requester one', () => {
    const message = refuseAttachmentRemoval('requester', 'support');

    expect(message).toContain('quem abriu o chamado');
    expect(message).toContain('baixar');
  });

  it('says the same, the other way around, for the requester', () => {
    expect(refuseAttachmentRemoval('support', 'requester')).toContain('TI');
  });
});

describe('onlyFrom', () => {
  const attachments = [
    { id: 1, origin: 'requester' as const },
    { id: 2, origin: 'support' as const },
    { id: 3, origin: 'requester' as const },
  ];

  // feliz
  it('keeps one side and leaves the other out', () => {
    expect(onlyFrom(attachments, 'requester').map((item) => item.id)).toEqual([1, 3]);
    expect(onlyFrom(attachments, 'support').map((item) => item.id)).toEqual([2]);
  });

  // triste
  it('answers nothing when that side sent nothing', () => {
    expect(onlyFrom([{ id: 1, origin: 'support' as const }], 'requester')).toEqual([]);
  });
});

describe('kindsUsedBy', () => {
  const attachments = [
    { origin: 'requester' as const, kind: 'pdf' as const },
    { origin: 'requester' as const, kind: 'pdf' as const },
    { origin: 'support' as const, kind: 'image' as const },
  ];

  // feliz
  /**
   * A COTA É POR LADO, e é este teste que tranca isso.
   *
   * Com cota compartilhada, alguém que abrisse o chamado com cinco PDFs deixaria o TI sem
   * poder anexar a nota fiscal da peça — e o TI não pode apagar os cinco para abrir espaço,
   * porque não são dele. Um lado travaria o outro sem ter como destravar.
   */
  it('counts only the formats of the side that is asking', () => {
    expect(kindsUsedBy(attachments, 'requester')).toEqual(['pdf', 'pdf']);
    expect(kindsUsedBy(attachments, 'support')).toEqual(['image']);
  });

  // triste
  it('counts nothing for a side that has attached nothing', () => {
    expect(kindsUsedBy([], 'support')).toEqual([]);
  });
});
