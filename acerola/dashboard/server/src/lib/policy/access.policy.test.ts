import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  canAttendTicket,
  canCreate,
  canManageAnyRecord,
  canManageInContext,
  canModifyRecord,
  canRead,
  getRoleInContext,
  isAdmin,
  isOwnRecord,
} from './access.policy';
import {
  assertCanAttendTicket,
  assertCanCreate,
  assertCanModifyRecord,
  assertIsAdmin,
} from './policy-assert.util';

const ANA = 'ana@empresa.com.br';
const BIA = 'bia@empresa.com.br';

describe('access.policy', () => {
  // feliz
  it('lets every role read and create', () => {
    for (const role of ['user', 'manager', 'admin'] as const) {
      expect(canRead(role)).toBe(true);
      expect(canCreate(role)).toBe(true);
    }
  });

  it('keeps other people records for manager and admin only', () => {
    expect(canManageAnyRecord('manager')).toBe(true);
    expect(canManageAnyRecord('admin')).toBe(true);
    expect(canManageAnyRecord('user')).toBe(false);
  });

  it('knows who is an admin', () => {
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('manager')).toBe(false);
  });

  // triste
  /* Fechado por padrão: sem papel, nada passa. */
  it('closes everything when there is no role', () => {
    expect(canRead(null)).toBe(false);
    expect(canCreate(undefined)).toBe(false);
    expect(canManageAnyRecord(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(canModifyRecord(null, ANA, ANA)).toBe(false);
  });
});

describe('isOwnRecord', () => {
  // feliz
  it('matches e-mails ignoring case and surrounding spaces', () => {
    expect(isOwnRecord('Ana@Empresa.com.br', ' ana@empresa.com.br ')).toBe(true);
  });

  // triste
  it('never matches when one side is missing', () => {
    expect(isOwnRecord(null, ANA)).toBe(false);
    expect(isOwnRecord(ANA, null)).toBe(false);
  });
});

describe('canModifyRecord', () => {
  // feliz
  it('lets anyone change their own record', () => {
    expect(canModifyRecord('user', ANA, ANA)).toBe(true);
  });

  it('lets manager and admin change what others created', () => {
    expect(canModifyRecord('manager', BIA, ANA)).toBe(true);
    expect(canModifyRecord('admin', BIA, ANA)).toBe(true);
  });

  // triste
  it('stops a plain user on someone else record', () => {
    expect(canModifyRecord('user', BIA, ANA)).toBe(false);
  });

  /* Registro sem autor gravado não vira "de todo mundo": só quem manda em tudo mexe nele. */
  it('does not turn an authorless record into everyone record', () => {
    expect(canModifyRecord('user', BIA, null)).toBe(false);
    expect(canModifyRecord('manager', BIA, null)).toBe(true);
  });
});

describe('policy-assert', () => {
  // feliz
  it('says nothing when the action is allowed', () => {
    expect(() => assertCanCreate('user', 'tarefas')).not.toThrow();
    expect(() => assertCanModifyRecord('user', ANA, ANA, 'Esta tarefa')).not.toThrow();
    expect(() => assertIsAdmin('admin', 'Gerenciar pessoas')).not.toThrow();
  });

  // triste
  /* A mensagem é parte da regra: ela precisa dizer o que resolve, não só "sem permissão". */
  it('explains who can change a record from someone else', () => {
    expect(() => assertCanModifyRecord('user', BIA, ANA, 'Esta tarefa')).toThrow(
      ForbiddenException,
    );
    expect(() => assertCanModifyRecord('user', BIA, ANA, 'Esta tarefa')).toThrow(/gerente/i);
  });

  it('refuses an admin action for a manager', () => {
    expect(() => assertIsAdmin('manager', 'Gerenciar pessoas')).toThrow(ForbiddenException);
  });
});

describe('canAttendTicket', () => {
  // feliz
  it('lets anyone on the IT panel attend, because a ticket has no owner on this side', () => {
    expect(canAttendTicket('user')).toBe(true);
    expect(canAttendTicket('manager')).toBe(true);
    expect(canAttendTicket('admin')).toBe(true);
  });

  // triste
  it('refuses someone with no role at all', () => {
    expect(canAttendTicket(null)).toBe(false);
    expect(canAttendTicket(undefined)).toBe(false);
  });
});

describe('assertCanAttendTicket', () => {
  // feliz
  it('lets an identified person through', () => {
    expect(() => assertCanAttendTicket('user')).not.toThrow();
  });

  // triste
  it('refuses a request with no identity, saying what was being attempted', () => {
    expect(() => assertCanAttendTicket(null)).toThrow(ForbiddenException);
    expect(() => assertCanAttendTicket(null)).toThrow(/atender chamados/i);
  });
});

describe('getRoleInContext & canManageInContext', () => {
  const user = {
    role: 'admin' as const,
    roles: {
      infra: 'user' as const,
      sistema: 'admin' as const,
      manutencao: 'manager' as const,
    },
  };

  // feliz
  it('resolves different roles for different contexts (user in infra, admin in sistema, manager in manutencao)', () => {
    expect(getRoleInContext(user, 'infra')).toBe('user');
    expect(getRoleInContext(user, 'sistema')).toBe('admin');
    expect(getRoleInContext(user, 'manutencao')).toBe('manager');

    expect(canManageInContext(user, 'infra')).toBe(false);
    expect(canManageInContext(user, 'sistema')).toBe(true);
    expect(canManageInContext(user, 'manutencao')).toBe(true);
  });

  // triste
  it('falls back to default user role when user is null or undefined', () => {
    expect(getRoleInContext(null, 'infra')).toBe('user');
    expect(canManageInContext(null, 'manutencao')).toBe(false);
  });
});
