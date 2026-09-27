import { describe, expect, it } from 'vitest';

import { anydeskFormSchema, anydeskSchema, formatAnydeskInput } from './anydesk.util';

describe('formatAnydeskInput', () => {
  // feliz
  it('groups a 9-digit AnyDesk ID in threes', () => {
    expect(formatAnydeskInput('123456789')).toBe('123 456 789');
  });

  it('builds the grouping progressively as each digit is typed', () => {
    expect(formatAnydeskInput('1')).toBe('1');
    expect(formatAnydeskInput('123')).toBe('123');
    expect(formatAnydeskInput('1234')).toBe('1 234');
    expect(formatAnydeskInput('123456')).toBe('123 456');
    expect(formatAnydeskInput('123456789')).toBe('123 456 789');
  });

  /* Com 10 dígitos sobra 1 solto na frente — é o formato que o próprio AnyDesk usa. */
  it('leaves a single loose digit up front once a 10th digit arrives', () => {
    expect(formatAnydeskInput('1234567890')).toBe('1 234 567 890');
  });

  it('accepts an ID that already arrives formatted, without doubling the spaces', () => {
    expect(formatAnydeskInput('123 456 789')).toBe('123 456 789');
    expect(formatAnydeskInput('1 234 567 890')).toBe('1 234 567 890');
  });

  // triste
  /* Reconstruir a partir só dos dígitos é o que faz letra e símbolo nunca sobreviverem. */
  it('drops every letter as it is typed, keeping only the digits', () => {
    expect(formatAnydeskInput('abc123def456ghi789')).toBe('123 456 789');
  });

  it('ignores digits typed past the 10th, instead of growing the mask forever', () => {
    expect(formatAnydeskInput('123456789012345')).toBe('1 234 567 890');
  });

  it('returns an empty string for an empty or non-digit value', () => {
    expect(formatAnydeskInput('')).toBe('');
    expect(formatAnydeskInput('abc')).toBe('');
  });
});

describe('anydeskFormSchema', () => {
  // feliz
  it('accepts a 9-digit ID', () => {
    expect(anydeskFormSchema.safeParse('123 456 789').success).toBe(true);
  });

  it('accepts a 10-digit ID', () => {
    expect(anydeskFormSchema.safeParse('1234567890').success).toBe(true);
  });

  /* O campo é opcional: "" não é um ID inválido, é a ausência de um. */
  it('accepts an empty value, because the field is optional', () => {
    expect(anydeskFormSchema.safeParse('').success).toBe(true);
  });

  // triste
  it('refuses a letter in the middle, even with enough digits', () => {
    const result = anydeskFormSchema.safeParse('123abc789');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('O AnyDesk só pode ter números e espaço');
  });

  it('refuses fewer digits than a real AnyDesk ID has', () => {
    const result = anydeskFormSchema.safeParse('12345');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('O AnyDesk tem 9 ou 10 números');
  });

  it('refuses more digits than a real AnyDesk ID has', () => {
    const result = anydeskFormSchema.safeParse('123456789012');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('O AnyDesk tem 9 ou 10 números');
  });
});

describe('anydeskSchema', () => {
  // feliz
  it('keeps a valid ID as a string', () => {
    expect(anydeskSchema.parse('123 456 789')).toBe('123 456 789');
  });

  // triste
  /* Vazio e nulo precisam significar a mesma coisa pro resto do sistema — nenhum código a
     partir daqui deveria distinguir "" de "sem AnyDesk". */
  it('turns an empty value into null, for the API', () => {
    expect(anydeskSchema.parse('')).toBeNull();
  });
});

describe('anydeskFormSchema × formatAnydeskInput', () => {
  /* O schema precisa aceitar exatamente o que a máscara produz. */
  it('accepts the shape the mask produces', () => {
    expect(anydeskFormSchema.safeParse(formatAnydeskInput('123456789')).success).toBe(true);
  });
});
