import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

import { load } from './+layout';

const at = (path: string) => ({ url: new URL(`https://acerola.exemplo.com${path}`) });

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));

const me = vi.mocked(authApi.me);

describe('a guarda de sessão', () => {
  beforeEach(() => {
    me.mockReset();
  });

  // feliz
  it('hands the signed-in person to the screens', async () => {
    const user = { id: 'user-1', name: 'Pessoa de Teste' } as Awaited<ReturnType<typeof authApi.me>>;
    me.mockResolvedValue(user);

    await expect(load(at('/infra/tickets'))).resolves.toEqual({ user });
  });

  // triste
  /* Depois de entrar, a pessoa volta para a tela que pediu. */
  it('sends who has no session to the login, remembering where they were', async () => {
    me.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const thrown: unknown = await load(at('/infra/tickets/7')).catch((error: unknown) => error);

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      status: 307,
      location: '/login?next=%2Finfra%2Ftickets%2F7',
    });
  });

  /* API fora do ar não é "sem sessão": o erro sobe, em vez de tirar a pessoa da tela. */
  it('lets any other failure through instead of redirecting', async () => {
    const failure = new ApiError(500, 'Internal Server Error');
    me.mockRejectedValue(failure);

    await expect(load(at('/infra/tickets'))).rejects.toBe(failure);
  });
});
