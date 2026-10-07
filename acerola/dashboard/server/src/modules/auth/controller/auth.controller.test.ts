import { describe, expect, it } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { AuthController } from './auth.controller';

const mockEnv = {
  NEON_AUTH_URL: 'https://auth.example.com',
} as Env;

describe('AuthController', () => {
  // feliz
  it('delivers the public auth configuration with the Neon Auth URL', () => {
    const controller = new AuthController(mockEnv);

    expect(controller.config()).toEqual({
      neonAuthUrl: 'https://auth.example.com',
    });
  });

  it('delivers the current session user', () => {
    const controller = new AuthController(mockEnv);
    const user: RequestUser = {
      id: 'usr_1',
      email: 'ana@example.com',
      name: 'Ana',
      role: 'user',
    };

    expect(controller.me(user)).toEqual(user);
  });

  // triste
  it('reflects whatever NEON_AUTH_URL is defined on the server environment', () => {
    const customEnv = { NEON_AUTH_URL: 'https://other-auth.neon.tech' } as Env;
    const controller = new AuthController(customEnv);

    expect(controller.config().neonAuthUrl).not.toBe('https://auth.example.com');
    expect(controller.config().neonAuthUrl).toBe('https://other-auth.neon.tech');
  });
});
