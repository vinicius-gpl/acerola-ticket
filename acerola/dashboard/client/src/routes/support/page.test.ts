import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';

import { load } from './+page';

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));
vi.mock('$lib/api/tickets.api', () => ({ ticketsApi: { myAreas: vi.fn() } }));

const me = vi.mocked(authApi.me);
const myAreas = vi.mocked(ticketsApi.myAreas);
const user = { id: 'user-1', name: 'Pessoa de Teste', role: 'user' } as Awaited<
  ReturnType<typeof authApi.me>
>;
const at = (path: string) => ({ url: new URL(`https://acerola.exemplo.com${path}`) });

describe('a rota da Central de Chamados (/support)', () => {
  beforeEach(() => {
    me.mockReset();
    myAreas.mockReset();
  });

  // feliz
  it('hands the signed-in person and the areas they attend to the screen', async () => {
    me.mockResolvedValue(user);
    myAreas.mockResolvedValue(['infra']);

    await expect(load(at('/support'))).resolves.toEqual({ user, areas: ['infra'] });
  });

  /* Ler as áreas é só para o link do painel: falhar não impede ninguém de abrir chamado. */
  it('still opens the screen when the areas could not be read', async () => {
    me.mockResolvedValue(user);
    myAreas.mockRejectedValue(new ApiError(500, 'Internal Server Error'));

    await expect(load(at('/support'))).resolves.toEqual({ user, areas: [] });
  });

  // triste
  /* O convite do WhatsApp vai junto para o login, e volta depois de entrar. */
  it('sends who has no session to the login, keeping the WhatsApp invite', async () => {
    me.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const thrown: unknown = await load(at('/support?invite=abc.def')).catch(
      (error: unknown) => error,
    );

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      status: 307,
      location: '/login?next=%2Fsupport%3Finvite%3Dabc.def',
    });
  });

  it('lets any other failure through instead of redirecting', async () => {
    const failure = new ApiError(500, 'Internal Server Error');
    me.mockRejectedValue(failure);

    await expect(load(at('/support'))).rejects.toBe(failure);
  });
});
