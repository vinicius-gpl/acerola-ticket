import { createSign } from 'node:crypto';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import { ENV } from '../../../lib/config/env.token';
import type { Env } from '../../../lib/config/env.schema';

@Injectable()
export class GithubAppService {
  private cached?: { token: string; expiresAt: number };
  private pending?: Promise<string>;

  constructor(@Inject(ENV) private readonly env: Env) {}

  get isConfigured(): boolean {
    return Boolean(
      this.env.GITHUB_APP_ID &&
      this.env.GITHUB_APP_INSTALLATION_ID &&
      this.env.GITHUB_APP_PRIVATE_KEY,
    );
  }

  async accessToken(): Promise<string> {
    if (!this.isConfigured)
      throw new ServiceUnavailableException(
        'Configure o GitHub App da organização para sincronizar os projetos.',
      );
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) return this.cached.token;
    if (this.pending) return this.pending;
    this.pending = this.issueToken();
    try {
      return await this.pending;
    } finally {
      this.pending = undefined;
    }
  }

  private async issueToken(): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: this.env.GITHUB_APP_ID })}`;
      const signature = createSign('RSA-SHA256')
        .update(payload)
        .sign(this.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'base64url');
      const response = await fetch(
        `https://api.github.com/app/installations/${this.env.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${payload}.${signature}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'AcerolaTicket',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error('Installation token rejected');
      const data = z
        .object({ token: z.string().min(1), expires_at: z.string().datetime() })
        .parse(await response.json());
      this.cached = { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
      return data.token;
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível autenticar a integração da organização no GitHub. Confira a instalação e suas credenciais.',
      );
    }
  }
}
