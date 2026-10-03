import { type IncomingMessage, type ServerResponse } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { parseEnv } from '../config/env.schema';
import {
  REDACTED_PATHS,
  REQUEST_ID_HEADER,
  buildLoggerOptions,
  levelForStatus,
  resolveRequestId,
  stripQuery,
  toPinoLevel,
} from './logger.options';

function fakeRequest(headers: Record<string, string> = {}): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

function fakeResponse(): ServerResponse & { setHeader: ReturnType<typeof vi.fn> } {
  return { setHeader: vi.fn() } as unknown as ServerResponse & {
    setHeader: ReturnType<typeof vi.fn>;
  };
}

const baseEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  R2_ACCOUNT_ID: 'test',
  R2_ACCESS_KEY_ID: 'test',
  R2_SECRET_ACCESS_KEY: 'test',
  R2_BUCKET: 'test',
  NEON_AUTH_URL: 'https://auth.test.invalid/auth',
};

describe('logger options', () => {
  // feliz
  it('maps the Nest log level to the pino level', () => {
    expect(toPinoLevel('log')).toBe('info');
    expect(toPinoLevel('debug')).toBe('debug');
    expect(toPinoLevel('warn')).toBe('warn');
    expect(toPinoLevel('error')).toBe('error');
  });

  // feliz
  it('keeps an incoming request id and echoes it back', () => {
    const response = fakeResponse();

    const id = resolveRequestId(fakeRequest({ [REQUEST_ID_HEADER]: 'abc-123' }), response);

    expect(id).toBe('abc-123');
    expect(response.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'abc-123');
  });

  // triste
  it('generates a request id when the incoming one is blank', () => {
    const response = fakeResponse();

    const id = resolveRequestId(fakeRequest({ [REQUEST_ID_HEADER]: '   ' }), response);

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });

  // triste
  it('drops the query string so secrets in the URL never reach the log', () => {
    expect(stripQuery('/api/webhooks/monitor?token=s3cret')).toBe('/api/webhooks/monitor');
    expect(stripQuery(undefined)).toBe('');
  });

  // feliz
  it('logs server errors as error, refusals as warn and the rest as info', () => {
    expect(levelForStatus(200)).toBe('info');
    expect(levelForStatus(404)).toBe('warn');
    expect(levelForStatus(503)).toBe('error');
    expect(levelForStatus(200, new Error('boom'))).toBe('error');
  });

  // feliz
  it('pretty-prints only in development', () => {
    const dev = buildLoggerOptions(parseEnv({ ...baseEnv, NODE_ENV: 'development' }));
    const prod = buildLoggerOptions(parseEnv({ ...baseEnv, NODE_ENV: 'production' }));

    expect(dev.pinoHttp).toMatchObject({ transport: { target: 'pino-pretty' } });
    expect(prod.pinoHttp).toMatchObject({ transport: undefined });
  });

  // triste
  it('redacts credential headers', () => {
    expect(REDACTED_PATHS).toContain('req.headers.authorization');
    expect(REDACTED_PATHS).toContain('req.headers.cookie');
  });
});
