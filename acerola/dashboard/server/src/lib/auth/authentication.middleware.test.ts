import { UnauthorizedException } from '@nestjs/common';
import { type Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AuthenticationMiddleware } from './authentication.middleware';
import { type SessionRepository } from './session.repository';

function makeRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function requestUser(request: Request): unknown {
  return (request as Request & { user?: unknown }).user;
}

describe('AuthenticationMiddleware', () => {
  // feliz
  it('attaches the identity from a valid session cookie', async () => {
    const identity = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin' as const };
    const sessions = { findIdentityByToken: vi.fn().mockResolvedValue(identity) };
    const middleware = new AuthenticationMiddleware(sessions as unknown as SessionRepository);
    const request = makeRequest({ cookie: 'session=abc123' });
    const next = vi.fn();

    await middleware.use(request, {} as never, next);

    expect(sessions.findIdentityByToken).toHaveBeenCalledWith('abc123');
    expect(requestUser(request)).toEqual(identity);
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to forwarded headers when there is no session cookie', async () => {
    const sessions = { findIdentityByToken: vi.fn() };
    const middleware = new AuthenticationMiddleware(sessions as unknown as SessionRepository);
    const request = makeRequest({
      'x-forwarded-user-id': '9',
      'x-forwarded-user-email': 'bia@empresa.com.br',
      'x-forwarded-user-name': 'Bia',
      'x-forwarded-user-role': 'viewer',
    });
    const next = vi.fn();

    await middleware.use(request, {} as never, next);

    expect(sessions.findIdentityByToken).not.toHaveBeenCalled();
    expect(requestUser(request)).toMatchObject({ email: 'bia@empresa.com.br', role: 'viewer' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('lets a request with no cookie and no header through unidentified, for the guard to decide', async () => {
    const sessions = { findIdentityByToken: vi.fn() };
    const middleware = new AuthenticationMiddleware(sessions as unknown as SessionRepository);
    const request = makeRequest();
    const next = vi.fn();

    await middleware.use(request, {} as never, next);

    expect(requestUser(request)).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  // triste
  it('ignores an expired or unknown session token and tries forwarded headers next', async () => {
    const sessions = { findIdentityByToken: vi.fn().mockResolvedValue(null) };
    const middleware = new AuthenticationMiddleware(sessions as unknown as SessionRepository);
    const request = makeRequest({ cookie: 'session=stale' });
    const next = vi.fn();

    await middleware.use(request, {} as never, next);

    expect(requestUser(request)).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('refuses a half-forwarded identity with 401, even on top of no session', async () => {
    const sessions = { findIdentityByToken: vi.fn() };
    const middleware = new AuthenticationMiddleware(sessions as unknown as SessionRepository);
    const request = makeRequest({ 'x-forwarded-user-email': 'bia@empresa.com.br' });

    await expect(middleware.use(request, {} as never, vi.fn())).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
