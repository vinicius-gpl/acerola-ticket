import { describe, expect, it } from 'vitest';

import { assignRoleSchema, internalRoleSchema } from './internal-role.schema';

describe('internalRoleSchema', () => {
  const valid = {
    id: 1,
    userId: 'usr_123',
    userEmail: 'dev@template.local',
    context: 'infra' as const,
    role: 'user' as const,
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@template.local',
    updatedAt: null,
    updatedBy: null,
  };

  // feliz
  it('accepts a valid internal role entry', () => {
    expect(internalRoleSchema.parse(valid)).toEqual(valid);
  });

  // triste
  it('refuses invalid context', () => {
    expect(internalRoleSchema.safeParse({ ...valid, context: 'invalid_ctx' }).success).toBe(false);
  });

  it('refuses invalid role', () => {
    expect(internalRoleSchema.safeParse({ ...valid, role: 'superadmin' }).success).toBe(false);
  });
});

describe('assignRoleSchema', () => {
  // feliz
  it('accepts valid assignment input', () => {
    const input = {
      userId: 'usr_123',
      userEmail: 'ana@empresa.com.br',
      context: 'manutencao' as const,
      role: 'manager' as const,
    };
    expect(assignRoleSchema.parse(input)).toEqual(input);
  });

  // triste
  it('refuses missing userId', () => {
    const input = {
      userId: '',
      context: 'sistema' as const,
      role: 'admin' as const,
    };
    expect(assignRoleSchema.safeParse(input).success).toBe(false);
  });

  it('refuses malformed email when provided', () => {
    const input = {
      userId: 'usr_123',
      userEmail: 'nao-e-email',
      context: 'sistema' as const,
      role: 'admin' as const,
    };
    expect(assignRoleSchema.safeParse(input).success).toBe(false);
  });
});
