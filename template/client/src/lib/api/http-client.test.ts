import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest, readError } from './http-client';

function respond(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // feliz
  it('returns the parsed body', async () => {
    vi.stubGlobal('fetch', respond(200, { id: 1 }));

    await expect(apiRequest('/tasks/1')).resolves.toEqual({ id: 1 });
  });

  it('drops empty filters from the query string', async () => {
    const fetchMock = respond(200, []);
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/tasks', { query: { search: '', status: 'done', page: 1, owner: null } });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks?status=done&page=1');
  });

  it('answers undefined for 204, instead of failing to parse an empty body', async () => {
    vi.stubGlobal('fetch', respond(204));

    await expect(apiRequest('/tasks/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  // triste
  it('throws the server message and field details, not a generic error', async () => {
    vi.stubGlobal(
      'fetch',
      respond(422, {
        statusCode: 422,
        message: 'Confira os campos destacados.',
        details: [{ field: 'title', message: 'Informe o título' }],
      }),
    );

    const error = (await apiRequest('/tasks', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Confira os campos destacados.');
    expect(error.details).toEqual([{ field: 'title', message: 'Informe o título' }]);
  });

  /* Um 502 do proxy vem com HTML. A tela precisa de uma frase, não de "undefined". */
  it('turns a body that is not the API format into a message with the status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));

    await expect(apiRequest('/tasks')).rejects.toThrow(/502/);
  });
});

describe('readError', () => {
  it('uses the API message', () => {
    expect(readError(new ApiError(403, 'Seu perfil é somente leitura.'))).toBe(
      'Seu perfil é somente leitura.',
    );
  });

  it('returns null when there is no error', () => {
    expect(readError(null)).toBeNull();
  });

  // triste
  it('explains a network failure in words the person can act on', () => {
    expect(readError(new TypeError('Failed to fetch'))).toMatch(/servidor/);
  });
});
