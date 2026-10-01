import { describe, expect, it } from 'vitest';

import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { toInternalRole, toInternalRoleInsert } from './roles.mapper';

describe('toInternalRole', () => {
  const row: InternalRoleRow = {
    id: 1,
    userId: 'usr_1',
    userEmail: 'dev@template.local',
    context: 'infra',
    role: 'user',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    createdBy: 'admin@template.local',
    updatedAt: new Date('2026-10-01T13:00:00.000Z'),
    updatedBy: 'admin@template.local',
  };

  // feliz
  it('maps database row to internal role contract with ISO date strings', () => {
    expect(toInternalRole(row)).toEqual({
      id: 1,
      userId: 'usr_1',
      userEmail: 'dev@template.local',
      context: 'infra',
      role: 'user',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: 'admin@template.local',
      updatedAt: '2026-10-01T13:00:00.000Z',
      updatedBy: 'admin@template.local',
    });
  });

  // triste
  it('handles null optional fields properly', () => {
    const minimal: InternalRoleRow = {
      ...row,
      userEmail: null,
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
    };

    expect(toInternalRole(minimal)).toEqual({
      id: 1,
      userId: 'usr_1',
      userEmail: null,
      context: 'infra',
      role: 'user',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
    });
  });
});

describe('toInternalRoleInsert', () => {
  // feliz
  it('stamps authorship from identity and trims fields', () => {
    const insert = toInternalRoleInsert(
      {
        userId: ' usr_1 ',
        userEmail: ' ana@empresa.com.br ',
        context: 'manutencao',
        role: 'manager',
      },
      'admin@empresa.com.br',
    );

    expect(insert).toEqual({
      userId: 'usr_1',
      userEmail: 'ana@empresa.com.br',
      context: 'manutencao',
      role: 'manager',
      createdBy: 'admin@empresa.com.br',
      updatedBy: 'admin@empresa.com.br',
    });
  });

  // triste
  it('normalizes empty email to null', () => {
    const insert = toInternalRoleInsert(
      {
        userId: 'usr_2',
        userEmail: '   ',
        context: 'sistema',
        role: 'admin',
      },
      'admin@empresa.com.br',
    );

    expect(insert.userEmail).toBeNull();
  });
});
