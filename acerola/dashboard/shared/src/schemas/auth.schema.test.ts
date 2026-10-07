import { describe, expect, it } from 'vitest';

import {
  authConfigSchema,
  forgotPasswordSchema,
  loginRequestSchema,
  resetPasswordSchema,
} from './auth.schema';

describe('loginRequestSchema', () => {
  // feliz
  it('accepts an e-mail and a password', () => {
    const parsed = loginRequestSchema.parse({ email: ' ana@empresa.com.br ', password: 'x' });

    expect(parsed).toEqual({ email: 'ana@empresa.com.br', password: 'x' });
  });

  // triste
  it('refuses an e-mail that is not an e-mail, naming the field', () => {
    const result = loginRequestSchema.safeParse({ email: 'ana', password: 'x' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe um e-mail válido');
  });

  it('refuses an empty password', () => {
    expect(
      loginRequestSchema.safeParse({ email: 'ana@empresa.com.br', password: '' }).success,
    ).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  // feliz
  it('accepts an e-mail', () => {
    expect(forgotPasswordSchema.parse({ email: 'ana@empresa.com.br' })).toEqual({
      email: 'ana@empresa.com.br',
    });
  });

  // triste
  it('refuses a blank e-mail', () => {
    expect(forgotPasswordSchema.safeParse({ email: '   ' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  // feliz
  it('accepts two equal passwords', () => {
    const input = { password: 'senha-longa-123', passwordConfirmation: 'senha-longa-123' };

    expect(resetPasswordSchema.parse(input)).toEqual(input);
  });

  // triste
  /* O erro precisa apontar para a CONFIRMAÇÃO: é nesse campo que a pessoa vai mexer. */
  it('refuses two different passwords, blaming the confirmation field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'senha-longa-123',
      passwordConfirmation: 'senha-longa-124',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirmation']);
    expect(result.error?.issues[0]?.message).toBe('As duas senhas precisam ser iguais');
  });

  it('refuses a password shorter than the minimum, saying the size', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'curta',
      passwordConfirmation: 'curta',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('8 caracteres');
  });
});

describe('authConfigSchema', () => {
  // feliz
  it('accepts a valid Neon Auth URL', () => {
    const input = { neonAuthUrl: 'https://ep-demo.neonauth.sa-east-1.aws.neon.tech/acerola/auth' };

    expect(authConfigSchema.parse(input)).toEqual(input);
  });

  // triste
  it('refuses an invalid URL', () => {
    const result = authConfigSchema.safeParse({ neonAuthUrl: 'nao-e-uma-url' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('A URL do Neon Auth precisa ser válida');
  });
});

