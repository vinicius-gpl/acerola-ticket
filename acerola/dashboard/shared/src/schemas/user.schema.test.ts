import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_ROLE,
  roleInContext,
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

  it('knows the four roles of the system', () => {
    expect(userRoleSchema.options).toEqual(['user', 'manager', 'admin', 'superadmin']);
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

  it('accepts custom roles per context (infra=user, sistema=admin, manutencao=manager)', () => {
    const withContexts = {
      ...valid,
      roles: {
        infra: 'user' as const,
        sistema: 'admin' as const,
        manutencao: 'manager' as const,
      },
    };
    expect(sessionUserSchema.parse(withContexts)).toEqual(withContexts);
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

describe('roleInContext', () => {
  // feliz
  it('resolves specific role in context when defined', () => {
    const user = {
      role: 'admin' as const,
      roles: {
        infra: 'user' as const,
        sistema: 'admin' as const,
        manutencao: 'manager' as const,
      },
    };
    expect(roleInContext(user, 'infra')).toBe('user');
    expect(roleInContext(user, 'sistema')).toBe('admin');
    expect(roleInContext(user, 'manutencao')).toBe('manager');
  });

  // triste
  it('falls back to role or default when context is not defined or user is null', () => {
    expect(roleInContext(null, 'infra')).toBe('user');
    expect(roleInContext({ role: 'manager' }, 'infra')).toBe('manager');
  });
});
