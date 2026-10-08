import { generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../lib/config/env.schema';
import { GithubAppService } from './github-app.service';

afterEach(() => vi.unstubAllGlobals());
describe('GitHub organization authentication', () => {
  it('refuses incomplete installation configuration', async () => {
    const service = new GithubAppService({} as Env);
    await expect(service.accessToken()).rejects.toThrow('Configure o GitHub App');
  });
  it('uses installation credentials and reuses the temporary token', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const service = new GithubAppService({
      GITHUB_APP_ID: '123',
      GITHUB_APP_INSTALLATION_ID: '456',
      GITHUB_APP_PRIVATE_KEY: privateKey.export({ format: 'pem', type: 'pkcs1' }).toString(),
    } as Env);
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'organization-token',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
          }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    expect(await service.accessToken()).toBe('organization-token');
    expect(await service.accessToken()).toBe('organization-token');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/app/installations/456/access_tokens',
    );
    const header = fetcher.mock.calls[0]?.[1].headers.Authorization as string;
    const jwt = header.slice(7).split('.');
    expect(JSON.parse(Buffer.from(jwt[1]!, 'base64url').toString())).toMatchObject({ iss: '123' });
  });
  it('does not expose private keys when authentication fails', async () => {
    const service = new GithubAppService({
      GITHUB_APP_ID: '123',
      GITHUB_APP_INSTALLATION_ID: '456',
      GITHUB_APP_PRIVATE_KEY: 'secret-invalid-key',
    } as Env);
    await expect(service.accessToken()).rejects.toThrow('Não foi possível autenticar');
  });
});
