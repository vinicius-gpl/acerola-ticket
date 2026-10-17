import { describe, expect, it } from 'vitest';

import {
  accessRequestDescription,
  emptyAccessRequest,
  fillAccessRequestStep,
  isAccessRequestCancel,
  isAccessRequestCommand,
  nextAccessRequestStep,
  parseEmail,
  parseFullName,
  parsePhone,
} from './access-request.util';

describe('isAccessRequestCommand', () => {
  // feliz
  it('recognizes the command with spaces around it and in any case', () => {
    expect(isAccessRequestCommand('/acesso')).toBe(true);
    expect(isAccessRequestCommand('  /ACESSO \n')).toBe(true);
  });

  // triste
  it('refuses the command inside a sentence', () => {
    expect(isAccessRequestCommand('/acesso ao portal')).toBe(false);
    expect(isAccessRequestCommand('acesso')).toBe(false);
  });
});

describe('isAccessRequestCancel', () => {
  // feliz
  it('recognizes the word that gives up', () => {
    expect(isAccessRequestCancel(' Cancelar ')).toBe(true);
    expect(isAccessRequestCancel('/cancelar')).toBe(true);
  });

  // triste
  it('does not treat an ordinary answer as giving up', () => {
    expect(isAccessRequestCancel('Maria Clara')).toBe(false);
  });
});

describe('parseFullName', () => {
  // feliz
  it('accepts name and surname, or a compound name, tidying the spaces', () => {
    expect(parseFullName('  Maria   Clara ')).toBe('Maria Clara');
    expect(parseFullName('João da Silva')).toBe('João da Silva');
    expect(parseFullName("Ana D'Ávila-Souza")).toBe("Ana D'Ávila-Souza");
  });

  // triste
  it('refuses a single name, a loose initial, digits and an empty answer', () => {
    expect(parseFullName('Maria')).toBeNull();
    expect(parseFullName('Maria S')).toBeNull();
    expect(parseFullName('Maria 123')).toBeNull();
    expect(parseFullName('   ')).toBeNull();
  });

  it('refuses a name longer than the ticket accepts', () => {
    expect(parseFullName(`Maria ${'a'.repeat(200)}`)).toBeNull();
  });
});

describe('parseEmail', () => {
  // feliz
  it('accepts an e-mail and keeps it in lower case', () => {
    expect(parseEmail(' Maria.Silva@Empresa.com.br ')).toBe('maria.silva@empresa.com.br');
  });

  // triste
  it('refuses what is not an e-mail', () => {
    expect(parseEmail('maria')).toBeNull();
    expect(parseEmail('maria@')).toBeNull();
    expect(parseEmail('maria silva@empresa.com')).toBeNull();
  });
});

describe('parsePhone', () => {
  // feliz
  it('keeps only the digits of a phone with area code', () => {
    expect(parsePhone('(62) 99999-0000')).toBe('62999990000');
    expect(parsePhone('+55 62 99999-0000')).toBe('5562999990000');
  });

  // triste
  it('refuses a phone without area code, or with digits to spare', () => {
    expect(parsePhone('99999-0000')).toBeNull();
    expect(parsePhone('1234567890123456')).toBeNull();
  });
});

describe('nextAccessRequestStep', () => {
  // feliz
  it('asks the fields in order and skips the phone WhatsApp already gave', () => {
    const draft = emptyAccessRequest('5562999990000');

    expect(nextAccessRequestStep(draft)).toBe('name');
    expect(nextAccessRequestStep({ ...draft, requesterName: 'Maria Clara' })).toBe('email');
    expect(
      nextAccessRequestStep({ ...draft, requesterName: 'Maria Clara', email: 'm@e.com' }),
    ).toBe('department');
  });

  it('is done when every field is filled', () => {
    expect(
      nextAccessRequestStep({
        requesterName: 'Maria Clara',
        email: 'm@e.com',
        phone: '62999990000',
        department: 'rh',
      }),
    ).toBeNull();
  });

  // triste
  it('asks the phone when WhatsApp hid it', () => {
    const draft = { ...emptyAccessRequest(null), requesterName: 'Maria Clara', email: 'm@e.com' };

    expect(nextAccessRequestStep(draft)).toBe('phone');
  });
});

describe('fillAccessRequestStep', () => {
  const draft = emptyAccessRequest(null);

  // feliz
  it('fills each field with the answer', () => {
    const named = fillAccessRequestStep(draft, 'name', 'Maria Clara');
    const department = fillAccessRequestStep(draft, 'department', '11');

    expect(named).toEqual({ ok: true, draft: { ...draft, requesterName: 'Maria Clara' } });
    expect(department).toEqual({ ok: true, draft: { ...draft, department: 'rh' } });
  });

  // triste
  it('explains how to answer when it did not understand, with the list again', () => {
    const name = fillAccessRequestStep(draft, 'name', 'Maria');
    const department = fillAccessRequestStep(draft, 'department', '99');

    expect(name).toMatchObject({ ok: false, error: expect.stringContaining('dois nomes') });
    expect(department).toMatchObject({ ok: false, error: expect.stringContaining('11. RH') });
  });
});

describe('accessRequestDescription', () => {
  // feliz
  it('puts everything the attendant needs in the description', () => {
    const description = accessRequestDescription({
      requesterName: 'Maria Clara',
      email: 'maria@empresa.com.br',
      phone: '62999990000',
    });

    expect(description).toContain('Pedido de usuário');
    expect(description).toContain('E-mail: maria@empresa.com.br');
    expect(description).toContain('Telefone: 62999990000');
  });

  // triste
  it('keeps the fields on separate lines, even with an odd name', () => {
    const description = accessRequestDescription({
      requesterName: 'Maria Clara',
      email: 'm@e.com',
      phone: '6299999000',
    });

    expect(description.split('\n')).toContain('Nome: Maria Clara');
  });
});

describe('the "who is who" step', () => {
  const ANA_SOUZA = { id: 'a1', name: 'Ana Souza', email: 'ana.souza@empresa.com.br' };
  const ANA_LIMA = { id: 'a2', name: 'Ana Lima', email: 'ana.lima@empresa.com.br' };
  const asking = {
    ...emptyAccessRequest('5562999990000'),
    requesterName: 'Ana',
    candidates: [ANA_SOUZA, ANA_LIMA],
  };

  // feliz
  it('asks who is who before anything else, and links the request to the one picked', () => {
    expect(nextAccessRequestStep(asking)).toBe('who');

    const picked = fillAccessRequestStep(asking, 'who', '2');

    expect(picked).toEqual({
      ok: true,
      draft: {
        ...asking,
        requesterId: 'a2',
        requesterName: 'Ana Lima',
        email: ANA_LIMA.email,
        candidates: null,
      },
    });
    /* O e-mail veio da conta: o próximo passo já é o setor. */
    expect(picked.ok && nextAccessRequestStep(picked.draft)).toBe('department');
  });

  it('goes on without a link when the person is none of them', () => {
    const none = fillAccessRequestStep(asking, 'who', '0');

    expect(none.ok && nextAccessRequestStep(none.draft)).toBe('email');
  });

  // triste
  it('repeats the list when the answer is not one of the options', () => {
    expect(fillAccessRequestStep(asking, 'who', '7')).toMatchObject({
      ok: false,
      error: expect.stringContaining('1. Ana Souza'),
    });
  });
});
