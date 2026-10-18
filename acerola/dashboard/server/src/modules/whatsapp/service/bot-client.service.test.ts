import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { BotClientService, botSessionId } from './bot-client.service';

const TOKEN = 't'.repeat(40);
const configured = { BOT_API_URL: 'http://bot.local:4005/', BOT_API_TOKEN: TOKEN } as Env;

function mockFetch(response: Partial<Response> | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;

    return response as Response;
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200): Partial<Response> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

afterEach(() => vi.unstubAllGlobals());

describe('BotClientService', () => {
  // feliz
  it('asks the bot for the status with the token, under a hashed session name', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ state: 'connected', qr: null, phone: '5562999990001' }),
    );

    const status = await new BotClientService(configured).status('user/1');

    expect(status).toEqual({ state: 'connected', qr: null, phone: '5562999990001' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://bot.local:4005/sessions/${botSessionId('user/1')}`);
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('starts a link and unlinks through the matching routes', async () => {
    const fetchMock = mockFetch(jsonResponse({ state: 'pairing', qr: 'qr', phone: null }));
    const client = new BotClientService(configured);

    await client.link('u1');
    vi.stubGlobal('fetch', fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response));
    await client.unlink('u1');

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toMatch(/\/link$/);
    expect(calls[0]?.[1].method).toBe('POST');
    expect(calls[1]?.[1].method).toBe('DELETE');
  });

  it('knows whether the integration is configured and defaults to localhost:4005', async () => {
    expect(new BotClientService(configured).isConfigured).toBe(true);
    expect(new BotClientService({ BOT_API_TOKEN: TOKEN } as Env).isConfigured).toBe(true);
    expect(new BotClientService({} as Env).isConfigured).toBe(false);
    expect(new BotClientService({ BOT_API_URL: 'http://bot.local' } as Env).isConfigured).toBe(
      false,
    );

    const fetchMock = mockFetch(
      jsonResponse({ state: 'disconnected', qr: null, phone: null }),
    );
    await new BotClientService({ BOT_API_TOKEN: TOKEN } as Env).status('user-1');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(`http://127.0.0.1:4005/sessions/${botSessionId('user-1')}`);
  });

  // triste
  it('refuses to call anything when the integration is not configured', async () => {
    const fetchMock = mockFetch(jsonResponse({}));

    await expect(new BotClientService({} as Env).status('u1')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /* O motivo de verdade fica de fora da mensagem: ele pode trazer endereço interno ou token. */
  it('turns a network failure into a message that hides the detail', async () => {
    mockFetch(new Error(`connect ECONNREFUSED bot.local with ${TOKEN}`));

    const attempt = new BotClientService(configured).status('u1');

    await expect(attempt).rejects.toThrow(BadGatewayException);
    await expect(attempt).rejects.not.toThrow(/ECONNREFUSED|tttt/);
  });

  it('treats a refusal from the bot and a malformed answer as the bot being unavailable', async () => {
    mockFetch(jsonResponse({ message: 'Unauthorized' }, 401));
    await expect(new BotClientService(configured).link('u1')).rejects.toThrow(BadGatewayException);

    mockFetch(jsonResponse({ state: 'flying' }));
    await expect(new BotClientService(configured).status('u1')).rejects.toThrow(
      BadGatewayException,
    );
  });
});

describe('botSessionId', () => {
  // feliz
  it('always fits the alphabet the bot accepts, whatever the user id looks like', () => {
    for (const id of ['3f1c9a52-7d5e-4c0b', 'user/with/slashes', '../../etc', 'ana@exemplo.com']) {
      expect(botSessionId(id)).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  // triste
  it('never gives two people the same session', () => {
    expect(botSessionId('user-1')).not.toBe(botSessionId('user-2'));
  });
});
