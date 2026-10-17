import { isHttpError, isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

import { load } from './+page';

const at = (path: string) => ({ url: new URL(`https://acerola.exemplo.com${path}`) });

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));

const me = vi.mocked(authApi.me);

describe('o endereço que não existe', () => {
  beforeEach(() => {
    me.mockReset();
  });

  // feliz
  it('sends who has no session to the login, remembering the address', async () => {
    me.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const thrown: unknown = await load(at('/nao-existe')).catch((failure: unknown) => failure);

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({ status: 307, location: '/login?next=%2Fnao-existe' });
  });

  // triste
  it('answers not found to the signed-in person', async () => {
    me.mockResolvedValue({ id: 'user-1' } as Awaited<ReturnType<typeof authApi.me>>);

    const thrown: unknown = await load(at('/nao-existe')).catch((failure: unknown) => failure);

    expect(isHttpError(thrown, 404)).toBe(true);
  });

  /* API fora do ar não é "sem sessão": o erro sobe, em vez de mandar para o login. */
  it('lets any other failure through instead of redirecting', async () => {
    const failure = new ApiError(500, 'Internal Server Error');
    me.mockRejectedValue(failure);

    await expect(load(at('/nao-existe'))).rejects.toBe(failure);
  });
});
