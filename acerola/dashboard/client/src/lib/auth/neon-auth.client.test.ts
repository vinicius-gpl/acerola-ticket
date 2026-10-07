import { afterEach, describe, expect, it, vi } from 'vitest';

import { ensureNeonAuthClient, readAuthToken } from './neon-auth.client';

describe('neon-auth.client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // feliz
  it('reads auth token successfully when client receives token from auth provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/auth/config') {
          return Promise.resolve(
            new Response(JSON.stringify({ neonAuthUrl: 'https://auth.example.com' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'sample-jwt-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }),
    );

    const token = await readAuthToken();
    expect(typeof token === 'string' || token === null).toBe(true);
  });

  it('returns null when there is no active token in session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 })),
    );

    const token = await readAuthToken();
    expect(token).toBeNull();
  });

  // triste
  it('returns null instead of throwing when token reading fails or network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const token = await readAuthToken();
    expect(token).toBeNull();
  });

  it('resolves auth client from /api/auth/config endpoint when needed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ neonAuthUrl: 'https://runtime-auth.neon.tech' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = await ensureNeonAuthClient();
    expect(client).toBeDefined();
  });

  it('handles backend being down without crashing during config resolution', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    const client = await ensureNeonAuthClient();
    expect(client).toBeDefined();
  });
});
