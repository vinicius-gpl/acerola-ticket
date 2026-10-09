import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@template/shared/schemas/user.schema';
import { GithubLinkedGuard } from './github-linked.guard';
import type { GithubOauthService } from './service/github-oauth.service';

function setup(
  role: 'user' | 'manager' | 'admin',
  method = 'GET',
  linked = false,
  globalRole: SessionUser['role'] = 'user',
) {
  const status = vi.fn().mockResolvedValue({ isLinked: linked });
  const guard = new GithubLinkedGuard({ status } as unknown as GithubOauthService);
  const user = { id: 'local-user', role: globalRole, roles: { sistema: role } };
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user, method }) }),
  } as ExecutionContext;
  return { guard, context, status };
}

describe('System GitHub access', () => {
  it('allows managers to read shared data without OAuth', async () => {
    const { guard, context, status } = setup('manager');
    expect(await guard.canActivate(context)).toBe(true);
    expect(status).not.toHaveBeenCalled();
  });
  it('prevents managers from editing even with an external admin role', async () => {
    const { guard, context, status } = setup('manager', 'POST', true, 'admin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(status).not.toHaveBeenCalled();
  });
  it('requires a verified link for System administrators', async () => {
    const { guard, context } = setup('admin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows linked System administrators to edit', async () => {
    const { guard, context } = setup('admin', 'PATCH', true);
    expect(await guard.canActivate(context)).toBe(true);
  });
  it('requires OAuth for super administrators too', async () => {
    const { guard, context } = setup('user', 'GET', false, 'superadmin');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
