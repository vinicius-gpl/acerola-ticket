import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_ROLE,
  sessionUserSchema,
  USER_ROLE_LABELS,
  userRoleSchema,
} from './user.schema';

describe('userRoleSchema', () => {
  it('has a screen label for every role', () => {
    for (const role of userRoleSchema.options) {
      expect(USER_ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it('knows the three roles of the system', () => {
    expect(userRoleSchema.options).toEqual(['user', 'manager', 'admin']);
  });

  /* Quem chega sem papel definido no Neon Auth precisa receber MENOS acesso, nunca mais. */
  it('falls back to the most restricted role', () => {
    expect(DEFAULT_USER_ROLE).toBe('user');
  });

  // triste
  it('refuses a role that does not exist, instead of guessing one', () => {
    expect(userRoleSchema.safeParse('superuser').success).toBe(false);
  });
});

describe('sessionUserSchema', () => {
  const valid = { id: '1', email: 'dev@template.local', name: 'Dev', role: 'admin' };

  // feliz
  it('accepts a complete identity', () => {
    expect(sessionUserSchema.parse(valid)).toEqual(valid);
  });

  /* Identidade pela metade não é identidade: completar o que falta com um valor padrão daria
     acesso a uma requisição que ninguém soube identificar. */
  it('refuses an identity without e-mail', () => {
    expect(sessionUserSchema.safeParse({ ...valid, email: undefined }).success).toBe(false);
  });

  it('refuses an e-mail that is not an e-mail', () => {
    expect(sessionUserSchema.safeParse({ ...valid, email: 'dev' }).success).toBe(false);
  });
});
