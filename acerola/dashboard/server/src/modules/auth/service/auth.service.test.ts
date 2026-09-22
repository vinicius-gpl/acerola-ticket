import { UnauthorizedException } from '@nestjs/common';
import { type Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { hashPassword } from '../../../lib/auth/password.util';
import { type UserRow } from '../../../lib/db/schema/users.schema';
import { type AuthRepository } from '../repository/auth.repository';
import { AuthService } from './auth.service';

function userRow(overrides: Partial<UserRow> = {}, passwordHash: string): UserRow {
  return {
    id: 1,
    email: 'ana@empresa.com.br',
    name: 'Ana',
    role: 'admin',
    passwordHash,
    createdAt: new Date('2026-09-14T12:00:00.000Z'),
    ...overrides,
  };
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return { NODE_ENV: 'test', API_PORT: 3336, ...overrides } as Env;
}

function fakeResponse(): Response {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
}

describe('AuthService.login', () => {
  // feliz
  it('opens a session and sets an HttpOnly cookie for the right password', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    const repository: Partial<AuthRepository> = {
      findUserByEmail: vi.fn().mockResolvedValue(userRow({}, passwordHash)),
      createSession: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(repository as AuthRepository, makeEnv());
    const response = fakeResponse();

    const user = await service.login('ana@empresa.com.br', 'correct-horse-battery', response);

    expect(user).toEqual({ id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin' });
    expect(response.cookie).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, secure: false, sameSite: 'lax' }),
    );
    expect(repository.createSession).toHaveBeenCalledOnce();
  });

  it('marks the cookie secure in production', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    const repository: Partial<AuthRepository> = {
      findUserByEmail: vi.fn().mockResolvedValue(userRow({}, passwordHash)),
      createSession: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(repository as AuthRepository, makeEnv({ NODE_ENV: 'production' }));
    const response = fakeResponse();

    await service.login('ana@empresa.com.br', 'correct-horse-battery', response);

    expect(response.cookie).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

  // triste
  it('refuses a wrong password without saying the email exists', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    const repository: Partial<AuthRepository> = {
      findUserByEmail: vi.fn().mockResolvedValue(userRow({}, passwordHash)),
      createSession: vi.fn(),
    };
    const service = new AuthService(repository as AuthRepository, makeEnv());

    await expect(
      service.login('ana@empresa.com.br', 'wrong-password', fakeResponse()),
    ).rejects.toThrow(UnauthorizedException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('refuses an email that does not exist, with the same message as a wrong password', async () => {
    const repository: Partial<AuthRepository> = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createSession: vi.fn(),
    };
    const service = new AuthService(repository as AuthRepository, makeEnv());

    await expect(service.login('ninguem@empresa.com.br', 'x', fakeResponse())).rejects.toThrow(
      'E-mail ou senha incorretos.',
    );
  });
});

describe('AuthService.logout', () => {
  // feliz
  it('deletes the session and clears the cookie', async () => {
    const repository: Partial<AuthRepository> = { deleteSession: vi.fn().mockResolvedValue(undefined) };
    const service = new AuthService(repository as AuthRepository, makeEnv());
    const response = fakeResponse();

    await service.logout('some-token', response);

    expect(repository.deleteSession).toHaveBeenCalledWith('some-token');
    expect(response.clearCookie).toHaveBeenCalledWith('session', { path: '/' });
  });

  // triste
  it('still clears the cookie when there was no token to begin with', async () => {
    const repository: Partial<AuthRepository> = { deleteSession: vi.fn() };
    const service = new AuthService(repository as AuthRepository, makeEnv());
    const response = fakeResponse();

    await service.logout(undefined, response);

    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalled();
  });
});
