import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { type Env } from '../../../lib/config/env.schema';
import { type GithubConnectionsRepository } from '../repository/github-connections.repository';
import { GithubOauthService, hashOauthValue } from './github-oauth.service';
import { decryptGithubToken, encryptGithubToken } from './github-token-cipher.util';

const key = 'ab'.repeat(32);
const env = {
  GITHUB_OAUTH_CLIENT_ID: 'client-id',
  GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
  GITHUB_OAUTH_REDIRECT_URI: 'https://acerola.example/api/integrations/github/callback',
  GITHUB_OAUTH_FRONTEND_URL: 'https://acerola.example',
  GITHUB_OAUTH_ENCRYPTION_KEY: key,
} as Env;

function setup(config = env) {
  const repository = {
    find: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    remove: vi.fn(),
    createState: vi.fn(),
    consumeState: vi.fn().mockResolvedValue(null),
  };
  const service = new GithubOauthService(
    config,
    repository as unknown as GithubConnectionsRepository,
  );
  return { service, repository };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Github OAuth linking', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('stores tokens encrypted and detects tampering', () => {
    const encrypted = encryptGithubToken('secret-token', key);
    expect(encrypted).not.toContain('secret-token');
    expect(decryptGithubToken(encrypted, key)).toBe('secret-token');
    expect(() => decryptGithubToken(encrypted, 'cd'.repeat(32))).toThrow();
  });

  it('binds authorization to the local user and browser with PKCE', async () => {
    const { service, repository } = setup();
    const result = await service.begin('user-1');
    const saved = repository.createState.mock.calls[0]![0];
    expect(saved.userId).toBe('user-1');
    expect(saved.stateHash).toBe(hashOauthValue(result.state));
    expect(saved.browserHash).toBe(hashOauthValue(result.browserSecret));
    const url = new URL(result.url);
    expect(url.origin).toBe('https://github.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('redirect_uri')).toBe(env.GITHUB_OAUTH_REDIRECT_URI);
    expect(saved.codeVerifier).not.toBe(url.searchParams.get('code_challenge'));
  });

  it('rejects callbacks without the browser proof before exchanging credentials', async () => {
    const { service } = setup();
    await expect(service.complete('code', 'state', undefined)).rejects.toThrow('expirou');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects expired or replayed state without calling GitHub', async () => {
    const { service } = setup();
    await expect(service.complete('code', 'state', 'browser')).rejects.toThrow('expirou');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps cancelled authorization unlinked', async () => {
    const { service, repository } = setup();
    repository.consumeState.mockResolvedValue({ userId: 'user-1' });
    await expect(service.complete(undefined, 'state', 'browser', 'access_denied')).rejects.toThrow(
      'cancelada',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('links the verified GitHub account to the user from state and encrypts both tokens', async () => {
    const { service, repository } = setup();
    repository.consumeState.mockResolvedValue({
      userId: 'user-1',
      codeVerifier: encryptGithubToken('verifier', key),
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json({
          access_token: 'access-secret',
          refresh_token: 'refresh-secret',
          scope: 'repo,read:user',
          expires_in: 3600,
          refresh_token_expires_in: 86400,
        }),
      )
      .mockResolvedValueOnce(json({ id: 42, login: 'developer' }));
    await service.complete('code', 'state', 'browser');
    const saved = repository.save.mock.calls[0]![0];
    expect(saved).toMatchObject({ userId: 'user-1', githubId: '42', login: 'developer' });
    expect(decryptGithubToken(saved.accessToken, key)).toBe('access-secret');
    expect(decryptGithubToken(saved.refreshToken, key)).toBe('refresh-secret');
    expect(saved.expiresAt).toBeInstanceOf(Date);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]!.body))).toMatchObject({
      code_verifier: 'verifier',
      code: 'code',
    });
  });

  it('does not link an account without profile authorization', async () => {
    const { service, repository } = setup();
    repository.consumeState.mockResolvedValue({
      userId: 'user-1',
      codeVerifier: encryptGithubToken('verifier', key),
    });
    vi.mocked(fetch).mockResolvedValueOnce(json({ access_token: 'token', scope: '' }));
    await expect(service.complete('code', 'state', 'browser')).rejects.toThrow('perfil');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refreshes expired access tokens and rotates the refresh token', async () => {
    const { service, repository } = setup();
    repository.find.mockResolvedValue({
      userId: 'user-1',
      githubId: '42',
      login: 'dev',
      accessToken: encryptGithubToken('old', key),
      refreshToken: encryptGithubToken('refresh', key),
      expiresAt: new Date(0),
      refreshExpiresAt: new Date(Date.now() + 86400_000),
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      json({
        access_token: 'new',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        refresh_token_expires_in: 86400,
      }),
    );
    await expect(service.accessToken('user-1')).resolves.toBe('new');
    expect(decryptGithubToken(repository.save.mock.calls[0]![0].refreshToken, key)).toBe(
      'new-refresh',
    );
  });

  it('reports revoked authorization as unlinked', async () => {
    const { service, repository } = setup();
    repository.find.mockResolvedValue({
      accessToken: encryptGithubToken('revoked', key),
      expiresAt: null,
    });
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 401));
    await expect(service.status('user-1')).resolves.toMatchObject({ isLinked: false, login: null });
  });

  it('keeps the gate closed when OAuth is not configured', async () => {
    const { service } = setup({} as Env);
    await expect(service.status('user-1')).resolves.toEqual({
      isConfigured: false,
      isLinked: false,
      login: null,
    });
    await expect(service.begin('user-1')).rejects.toThrow('configurada');
  });

  it('redirects only to the configured System dashboard', () => {
    const { service } = setup();
    expect(service.frontendRedirect()).toBe('https://acerola.example/system/dashboard');
    expect(service.frontendRedirect('cancelled')).toBe(
      'https://acerola.example/system/dashboard?github_error=cancelled',
    );
  });
});
