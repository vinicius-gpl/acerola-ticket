import { describe, expect, it } from 'vitest';

import { contactPhoneSchema, sanitizePhoneInput } from './phone.util';

describe('contactPhoneSchema', () => {
  // feliz
  it('accepts a phone typed with area code and punctuation', () => {
    expect(contactPhoneSchema.safeParse('62 99999-9999').success).toBe(true);
  });

  it('accepts a phone typed with no punctuation at all', () => {
    expect(contactPhoneSchema.safeParse('62999999999').success).toBe(true);
  });

  // triste
  it('refuses a phone without area code', () => {
    const result = contactPhoneSchema.safeParse('99999-9999');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o WhatsApp com DDD');
  });

  /* Contar dígitos com `\D` some com letra no meio: "62abc9999999" tinha dígitos de sobra e
     passava, mesmo não sendo um telefone de verdade. */
  it('refuses a phone with a letter in it, even with enough digits', () => {
    const result = contactPhoneSchema.safeParse('62abc9999999');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'O WhatsApp só pode ter números, espaço, parênteses e traço',
    );
  });

  it('refuses a phone longer than the limit', () => {
    const result = contactPhoneSchema.safeParse('6'.repeat(41));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Esse telefone é longo demais');
  });
});

describe('sanitizePhoneInput', () => {
  // feliz
  it('keeps digits, spaces, parentheses, plus and dash', () => {
    expect(sanitizePhoneInput('+55 (62) 99999-9999')).toBe('+55 (62) 99999-9999');
  });

  // triste
  /* O mesmo caractere que o schema aceita é o que o filtro deixa passar — nenhum dos dois
     pode discordar do que é "número de telefone". */
  it('strips any letter as it is typed', () => {
    expect(sanitizePhoneInput('62abc999999')).toBe('62999999');
  });

  it('strips symbols that are not part of a phone number', () => {
    expect(sanitizePhoneInput('62.99999@9999!')).toBe('62999999999');
  });
});
