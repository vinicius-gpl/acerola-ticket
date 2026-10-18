import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import { type UserRole } from '@template/shared/schemas/user.schema';
import { describe, expect, it } from 'vitest';

import { ANY_MODULE, MODULE_CONTEXT } from './module-context.decorator';
import { IS_PUBLIC } from './public.decorator';
import { type RequestUser } from './request-user.type';
import { REQUIRED_ROLES } from './roles.decorator';
import { RolesGuard } from './roles.guard';

/** Ana é Usuária de Infraestrutura: tem o módulo, no nível mais baixo. */
const reader: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
  roles: { infra: 'user' },
};

/** Caio é Gestor de Manutenção: trabalha no módulo dele. */
const maintenanceManager: RequestUser = {
  id: '3',
  email: 'caio@empresa.com.br',
  name: 'Caio',
  role: 'manager',
  roles: { manutencao: 'manager' },
};

/** Administrador de Infraestrutura: mexe em tudo lá, e só lá. */
const infraAdmin: RequestUser = {
  id: '2',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  role: 'admin',
  roles: { infra: 'admin' },
};

const superadmin: RequestUser = {
  id: 'super-1',
  email: 'super@empresa.com.br',
  name: 'Super Admin',
  role: 'superadmin',
  roles: { infra: 'admin', sistema: 'admin', manutencao: 'admin' },
};

type Request = { user?: RequestUser; method: string };

function makeContext(
  user: RequestUser | undefined,
  method = 'GET',
): { context: ExecutionContext; request: Request } {
  const request: Request = { user, method };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

type Metadata = {
  isPublic?: boolean;
  roles?: UserRole[];
  module?: RoleContext;
  anyModule?: boolean;
};

function makeReflector(values: Metadata): Reflector {
  const byKey: Record<string, unknown> = {
    [IS_PUBLIC]: values.isPublic,
    [REQUIRED_ROLES]: values.roles,
    [MODULE_CONTEXT]: values.module,
    [ANY_MODULE]: values.anyModule,
  };

  return { getAllAndOverride: (key: string) => byKey[key] } as unknown as Reflector;
}

function allows(metadata: Metadata, user: RequestUser | undefined, method = 'GET'): boolean {
  return new RolesGuard(makeReflector(metadata)).canActivate(makeContext(user, method).context);
}

describe('RolesGuard', () => {
  // feliz
  it('allows a public route through without any identity', () => {
    expect(allows({ isPublic: true }, undefined)).toBe(true);
  });

  it('allows an identified request on a route open to any module', () => {
    expect(allows({ anyModule: true }, reader)).toBe(true);
  });

  it('allows a role listed in @Roles()', () => {
    expect(allows({ roles: ['admin', 'manager'] }, maintenanceManager)).toBe(true);
  });

  it('allows superadmin even when @Roles() only lists admin', () => {
    expect(allows({ roles: ['admin'] }, superadmin)).toBe(true);
  });

  it('lets someone with the module read it', () => {
    expect(allows({ module: 'infra' }, reader, 'GET')).toBe(true);
  });

  /* O service recebe o nível DAQUELE módulo, e não o papel principal. */
  it('hands the module level to the service', () => {
    const { context, request } = makeContext(maintenanceManager, 'POST');

    expect(new RolesGuard(makeReflector({ module: 'manutencao' })).canActivate(context)).toBe(true);
    expect(request.user?.role).toBe('manager');
  });

  /* Passada a tranca, o papel da requisição é o DAQUELE módulo: o service recebe `admin`. */
  it('lets an Administrator of the module write, with the module role on the request', () => {
    const { context, request } = makeContext(infraAdmin, 'PATCH');

    expect(new RolesGuard(makeReflector({ module: 'infra' })).canActivate(context)).toBe(true);
    expect(request.user?.role).toBe('admin');
  });

  it('lets the super-admin into any module, keeping the super-admin role', () => {
    const { context, request } = makeContext(superadmin, 'DELETE');

    expect(new RolesGuard(makeReflector({ module: 'manutencao' })).canActivate(context)).toBe(true);
    expect(request.user?.role).toBe('superadmin');
  });

  /* O que cada nível faz no módulo é a policy do service; a tranca só pede o módulo. */
  it('lets the user of the module reach the service also for writes', () => {
    const { context, request } = makeContext(reader, 'POST');

    expect(new RolesGuard(makeReflector({ module: 'infra' })).canActivate(context)).toBe(true);
    expect(request.user?.role).toBe('user');
  });

  // triste
  it('refuses a non-public route without identity, with 401', () => {
    expect(() => allows({ module: 'infra' }, undefined)).toThrow(UnauthorizedException);
  });

  it('refuses a role not listed in @Roles(), with 403 naming who can', () => {
    expect(() => allows({ roles: ['admin'] }, maintenanceManager)).toThrow(ForbiddenException);
  });

  /* Administrar um módulo não abre os outros: quem abre é o super-admin, em Acessos. */
  it('refuses an Administrator in a module they do not have', () => {
    expect(() => allows({ module: 'sistema' }, infraAdmin, 'GET')).toThrow(/não tem acesso/);
  });

  /* Rota nasce fechada: sem módulo declarado e sem `@AnyModule()`, ninguém passa. */
  it('refuses a route that does not say which module it belongs to', () => {
    expect(() => allows({}, infraAdmin)).toThrow(ForbiddenException);
  });
});
