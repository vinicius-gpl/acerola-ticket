import { describe, expect, it } from 'vitest';

import { contactPhoneSchema, formatPhoneInput } from './phone.util';

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

describe('formatPhoneInput', () => {
  // feliz
  it('formats a mobile number as DD 90000-0000 once the 9th digit after the DDD arrives', () => {
    expect(formatPhoneInput('62999999999')).toBe('62 99999-9999');
  });

  it('formats a landline as DD 0000-0000, four and four, without a 9th digit', () => {
    expect(formatPhoneInput('6233334444')).toBe('62 3333-4444');
  });

  it('builds the mask progressively as each digit is typed', () => {
    expect(formatPhoneInput('6')).toBe('6');
    expect(formatPhoneInput('62')).toBe('62');
    expect(formatPhoneInput('629')).toBe('62 9');
    expect(formatPhoneInput('62999')).toBe('62 999');
    expect(formatPhoneInput('629999')).toBe('62 9999');
    expect(formatPhoneInput('6299999')).toBe('62 9999-9');
    expect(formatPhoneInput('62999999999')).toBe('62 99999-9999');
  });

  /* Antes do 11º dígito a máscara não sabe ainda se vira fixo (8 dígitos) ou celular (9): o
     segundo grupo só cresce, e vira 5-4 de uma vez quando o número fecha em 11 dígitos. */
  it('keeps the second group growing until the number is complete', () => {
    expect(formatPhoneInput('62999998')).toBe('62 9999-98');
    expect(formatPhoneInput('629999988')).toBe('62 9999-988');
    expect(formatPhoneInput('6299999888')).toBe('62 9999-9888');
    expect(formatPhoneInput('62999998888')).toBe('62 99999-8888');
  });

  it('accepts a number that already arrives formatted, without doubling the punctuation', () => {
    expect(formatPhoneInput('(62) 99999-9999')).toBe('62 99999-9999');
  });

  // triste
  /* Reconstruir a partir só dos dígitos é o que faz letra e símbolo nunca sobreviverem — não
     tem um caractere de "letra formatada" pra vazar por uma máscara que ignora os outros. */
  it('drops every letter as it is typed, keeping only the digits', () => {
    expect(formatPhoneInput('62abc999999')).toBe('62 9999-99');
  });

  it('drops symbols that are not part of the mask', () => {
    expect(formatPhoneInput('62.99999@9999!')).toBe('62 99999-9999');
  });

  it('ignores digits typed past the 11th, instead of growing the mask forever', () => {
    expect(formatPhoneInput('629999999999999')).toBe('62 99999-9999');
  });

  it('returns an empty string for an empty or non-digit value', () => {
    expect(formatPhoneInput('')).toBe('');
    expect(formatPhoneInput('abc')).toBe('');
  });
});

describe('contactPhoneSchema × formatPhoneInput', () => {
  /* O schema precisa aceitar exatamente o que a máscara produz — senão a pessoa digita
     "certo" (seguindo a máscara na tela) e o envio recusa mesmo assim. */
  it('accepts the mobile shape the mask produces', () => {
    expect(contactPhoneSchema.safeParse(formatPhoneInput('62999999999')).success).toBe(true);
  });

  it('accepts the landline shape the mask produces', () => {
    expect(contactPhoneSchema.safeParse(formatPhoneInput('6233334444')).success).toBe(true);
  });
});
