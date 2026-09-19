import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  canDelete,
  canEdit,
  canRead,
  canRemoveOwnRecord,
  isAdmin,
  isOwnRecord,
} from './access.policy';
import { assertCanDelete, assertCanEdit, assertCanRemoveOwnRecord } from './policy-assert.util';

describe('access.policy', () => {
  // feliz
  it('lets every known role read', () => {
    expect(canRead('admin')).toBe(true);
    expect(canRead('editor')).toBe(true);
    expect(canRead('viewer')).toBe(true);
  });

  it('lets admin and editor write', () => {
    expect(canEdit('admin')).toBe(true);
    expect(canEdit('editor')).toBe(true);
  });

  // triste
  /* Fechado por padrão: sem papel, nada passa. */
  it('closes everything when there is no role', () => {
    expect(canRead(null)).toBe(false);
    expect(canEdit(undefined)).toBe(false);
    expect(canDelete(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('keeps viewer read-only', () => {
    expect(canEdit('viewer')).toBe(false);
    expect(canDelete('viewer')).toBe(false);
  });

  it('keeps deleting as an admin decision, even for an editor', () => {
    expect(canDelete('editor')).toBe(false);
    expect(canDelete('admin')).toBe(true);
  });
});

describe('isOwnRecord', () => {
  // feliz
  it('matches e-mails ignoring case and surrounding spaces', () => {
    expect(isOwnRecord('Ana@Empresa.com.br', ' ana@empresa.com.br ')).toBe(true);
  });

  // triste
  it('never matches when one side is missing', () => {
    expect(isOwnRecord(null, 'ana@empresa.com.br')).toBe(false);
    expect(isOwnRecord('ana@empresa.com.br', null)).toBe(false);
  });
});

describe('canRemoveOwnRecord', () => {
  it('lets an editor remove what they created', () => {
    expect(canRemoveOwnRecord('editor', 'ana@empresa.com.br', 'ana@empresa.com.br')).toBe(true);
  });

  it('lets an admin remove what someone else created', () => {
    expect(canRemoveOwnRecord('admin', 'chefe@empresa.com.br', 'ana@empresa.com.br')).toBe(true);
  });

  // triste
  it('does not let an editor remove what someone else created', () => {
    expect(canRemoveOwnRecord('editor', 'bia@empresa.com.br', 'ana@empresa.com.br')).toBe(false);
  });

  /* Escalada de privilégio: viewer não escreve, nem no que "é dele". */
  it('does not let a viewer remove even their own record', () => {
    expect(canRemoveOwnRecord('viewer', 'ana@empresa.com.br', 'ana@empresa.com.br')).toBe(false);
  });
});

describe('policy-assert.util', () => {
  it('passes silently when allowed', () => {
    expect(() => assertCanEdit('editor', 'a tarefa')).not.toThrow();
  });

  // triste
  it('refuses with 403 and says what was being attempted', () => {
    expect(() => assertCanEdit('viewer', 'a tarefa')).toThrow(ForbiddenException);
    expect(() => assertCanEdit('viewer', 'a tarefa')).toThrow(/a tarefa/);
  });

  it('says deleting is an admin action', () => {
    expect(() => assertCanDelete('editor', 'a tarefa')).toThrow(/administrador/);
  });

  it('says who can remove a record that belongs to someone else', () => {
    expect(() =>
      assertCanRemoveOwnRecord('editor', 'bia@empresa.com.br', 'ana@empresa.com.br', 'A tarefa'),
    ).toThrow(/quem o criou/);
  });
});
