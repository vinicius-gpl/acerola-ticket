import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupApp } from '../../../app.setup';
import type { Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { RolesGuard } from '../../../lib/auth/roles.guard';
import { GithubConnectionsRepository } from '../repository/github-connections.repository';
import { GithubOauthService } from '../service/github-oauth.service';
import { decryptGithubToken } from '../service/github-token-cipher.util';
import { GithubIntegrationController } from './github-integration.controller';

const key = 'ab'.repeat(32);
const config = {
  API_CORS_ORIGIN: 'http://localhost:5001',
  GITHUB_OAUTH_CLIENT_ID: 'test-client',
  GITHUB_OAUTH_CLIENT_SECRET: 'test-secret',
  GITHUB_OAUTH_REDIRECT_URI: 'http://localhost:5001/api/integrations/github/callback',
  GITHUB_OAUTH_FRONTEND_URL: 'http://localhost:5001',
  GITHUB_OAUTH_ENCRYPTION_KEY: key,
} as Env;

describe('GitHub OAuth HTTP flow', () => {
  let app: INestApplication;
  let pending: Record<string, unknown> | undefined;
  let linked: Record<string, unknown> | undefined;
  let fetcher: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    pending = undefined;
    linked = undefined;
    fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const repository = {
      createState: vi.fn(async (state) => {
        pending = state;
      }),
      consumeState: vi.fn(async (stateHash, browserHash) => {
        if (pending?.stateHash !== stateHash || pending?.browserHash !== browserHash) return null;
        const value = pending;
        pending = undefined;
        return value;
      }),
      save: vi.fn(async (connection) => {
        linked = connection;
      }),
      find: vi.fn(async () => linked ?? null),
    };
    const module = await Test.createTestingModule({
      controllers: [GithubIntegrationController],
      providers: [
        GithubOauthService,
        { provide: ENV, useValue: config },
        { provide: GithubConnectionsRepository, useValue: repository },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApp(app, config);
    app.use(
      (
        req: { headers: Record<string, string>; user?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        if (req.headers.authorization === 'Bearer local-session')
          req.user = { id: 'local-admin', role: 'admin' };
        next();
      },
    );
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllGlobals();
  });

  async function begin() {
    const response = await request(app.getHttpServer())
      .post('/api/integrations/github/authorize')
      .set('Authorization', 'Bearer local-session')
      .expect(201);
    const state = new URL(response.body.url).searchParams.get('state')!;
    const cookie = (response.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    return { response, state, cookie };
  }

  it('requires a local session before linking an account', async () => {
    await request(app.getHttpServer()).post('/api/integrations/github/authorize').expect(401);
    expect(pending).toBeUndefined();
  });

  it('links the authenticated local user and returns to the System dashboard', async () => {
    const { response, state, cookie } = await begin();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.body).not.toHaveProperty('browserSecret');
    expect(new URL(response.body.url).searchParams.get('redirect_uri')).toBe(
      config.GITHUB_OAUTH_REDIRECT_URI,
    );
    fetcher
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'github-token', scope: 'read:user' })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 123, login: 'developer' })));
    const callback = await request(app.getHttpServer())
      .get('/api/integrations/github/callback')
      .query({ state, code: 'github-code' })
      .set('Cookie', cookie)
      .expect(303);
    expect(callback.headers.location).toBe('http://localhost:5001/system/dashboard');
    expect(linked).toMatchObject({ userId: 'local-admin', githubId: '123', login: 'developer' });
    expect(decryptGithubToken(linked!.accessToken as string, key)).toBe('github-token');
    await request(app.getHttpServer())
      .get('/api/integrations/github/callback')
      .query({ state, code: 'github-code' })
      .set('Cookie', cookie)
      .expect(303)
      .expect('Location', 'http://localhost:5001/system/dashboard?github_error=failed');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refuses callbacks from a browser without the authorization cookie', async () => {
    const { state } = await begin();
    await request(app.getHttpServer())
      .get('/api/integrations/github/callback')
      .query({ state, code: 'github-code' })
      .expect(303)
      .expect('Location', 'http://localhost:5001/system/dashboard?github_error=failed');
    expect(fetcher).not.toHaveBeenCalled();
    expect(linked).toBeUndefined();
  });

  it('returns cancellation to the dashboard without saving a link', async () => {
    const { state, cookie } = await begin();
    await request(app.getHttpServer())
      .get('/api/integrations/github/callback')
      .query({ state, error: 'access_denied' })
      .set('Cookie', cookie)
      .expect(303)
      .expect('Location', 'http://localhost:5001/system/dashboard?github_error=cancelled');
    expect(fetcher).not.toHaveBeenCalled();
    expect(linked).toBeUndefined();
  });
});
