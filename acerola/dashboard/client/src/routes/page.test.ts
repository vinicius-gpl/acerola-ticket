import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';

import { load } from './+page';

vi.mock('$lib/api/tickets.api', () => ({ ticketsApi: { myAreas: vi.fn() } }));

const myAreas = vi.mocked(ticketsApi.myAreas);
const root = { url: new URL('https://acerola.exemplo.com/') };

async function destination(): Promise<unknown> {
  return load(root).catch((thrown: unknown) => thrown);
}

describe('a raiz', () => {
  beforeEach(() => {
    myAreas.mockReset();
  });

  // feliz
  it('opens the tickets of the last context for who attends an area', async () => {
    myAreas.mockResolvedValue(['infra']);

    const thrown = await destination();

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({ status: 307, location: '/infra/tickets' });
  });

  /* Quem só pede socorro não tem painel: o lugar dela é a Central de Chamados. */
  it('sends who attends no area to the support screen', async () => {
    myAreas.mockResolvedValue([]);

    await expect(destination()).resolves.toMatchObject({ status: 307, location: '/support' });
  });

  // triste
  it('sends who has no session to the login', async () => {
    myAreas.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    await expect(destination()).resolves.toMatchObject({ status: 307, location: '/login' });
  });
});
