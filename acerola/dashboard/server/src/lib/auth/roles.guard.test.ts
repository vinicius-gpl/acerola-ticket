import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type UserRole } from '@template/shared/schemas/user.schema';
import { describe, expect, it } from 'vitest';

import { IS_PUBLIC } from './public.decorator';
import { type RequestUser } from './request-user.type';
import { RolesGuard } from './roles.guard';

const manager: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'manager',
};

function makeContext(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(values: { isPublic?: boolean; roles?: UserRole[] }): Reflector {
  return {
    getAllAndOverride: (key: string) => (key === IS_PUBLIC ? values.isPublic : values.roles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  // feliz
  it('allows a public route through without any identity', () => {
    const guard = new RolesGuard(makeReflector({ isPublic: true }));

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows an identified request when the route requires no specific role', () => {
    const guard = new RolesGuard(makeReflector({}));

    expect(guard.canActivate(makeContext(manager))).toBe(true);
  });

  it('allows a role listed in @Roles()', () => {
    const guard = new RolesGuard(makeReflector({ roles: ['admin', 'manager'] }));

    expect(guard.canActivate(makeContext(manager))).toBe(true);
  });

  // triste
  it('refuses a non-public route without identity, with 401', () => {
    const guard = new RolesGuard(makeReflector({}));

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('refuses a role not listed in @Roles(), with 403 naming who can', () => {
    const guard = new RolesGuard(makeReflector({ roles: ['admin'] }));

    expect(() => guard.canActivate(makeContext(manager))).toThrow(ForbiddenException);
  });
});
