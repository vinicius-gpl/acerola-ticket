import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { type GithubConnection } from '@template/shared/schemas/github-connection.schema';
import { ENV } from '../../../lib/config/env.token';
import { type Env } from '../../../lib/config/env.schema';
import { GithubConnectionsRepository } from '../repository/github-connections.repository';
import { decryptGithubToken, encryptGithubToken } from './github-token-cipher.util';

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().positive().optional(),
  refresh_token_expires_in: z.number().positive().optional(),
  scope: z.string().optional(),
});
const accountSchema = z.object({ id: z.number(), login: z.string().min(1) });
export const GITHUB_LINK_REQUIRED = 'Vincule sua conta do GitHub para acessar o módulo Sistema.';

export function hashOauthValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class GithubOauthService {
  private readonly refreshes = new Map<string, Promise<string>>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repository: GithubConnectionsRepository,
  ) {}

  get isConfigured(): boolean {
    return Boolean(
      this.env.GITHUB_OAUTH_CLIENT_ID &&
      this.env.GITHUB_OAUTH_CLIENT_SECRET &&
      this.env.GITHUB_OAUTH_REDIRECT_URI &&
      this.env.GITHUB_OAUTH_FRONTEND_URL &&
      this.env.GITHUB_OAUTH_ENCRYPTION_KEY,
    );
  }

  private configuration() {
    if (!this.isConfigured)
      throw new ServiceUnavailableException(
        'A vinculação com o GitHub ainda não foi configurada. Solicite a configuração ao administrador.',
      );
    return {
      clientId: this.env.GITHUB_OAUTH_CLIENT_ID!,
      clientSecret: this.env.GITHUB_OAUTH_CLIENT_SECRET!,
      redirectUri: this.env.GITHUB_OAUTH_REDIRECT_URI!,
      encryptionKey: this.env.GITHUB_OAUTH_ENCRYPTION_KEY!,
    };
  }

  frontendRedirect(error?: string): string {
    const base = this.env.GITHUB_OAUTH_FRONTEND_URL;
    if (!base)
      throw new ServiceUnavailableException(
        'Configure o endereço do painel para concluir a vinculação.',
      );
    const url = new URL('/system/dashboard', base);
    if (error) url.searchParams.set('github_error', error);
    return url.toString();
  }

  async status(userId: string): Promise<GithubConnection> {
    if (!this.isConfigured) return { isConfigured: false, isLinked: false, login: null };
    try {
      const token = await this.accessToken(userId);
      const account = await this.account(token);
      const connection = await this.repository.find(userId);
      if (String(account.id) !== connection?.githubId) {
        await this.repository.remove(userId);
        return { isConfigured: true, isLinked: false, login: null };
      }
      return { isConfigured: true, isLinked: true, login: account.login };
    } catch (error) {
      if (error instanceof ForbiddenException)
        return { isConfigured: true, isLinked: false, login: null };
      throw error;
    }
  }

  async begin(userId: string): Promise<{ url: string; browserSecret: string; state: string }> {
    const config = this.configuration();
    const state = randomBytes(32).toString('base64url');
    const browserSecret = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    await this.repository.createState({
      userId,
      stateHash: hashOauthValue(state),
      browserHash: hashOauthValue(browserSecret),
      codeVerifier: encryptGithubToken(verifier, config.encryptionKey),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'read:user',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      allow_signup: 'false',
    }).toString();
    return { url: url.toString(), browserSecret, state };
  }

  async complete(
    code: string | undefined,
    state: string | undefined,
    browserSecret: string | undefined,
    denied?: string,
  ): Promise<void> {
    const config = this.configuration();
    if (!state || !browserSecret)
      throw new BadRequestException('A vinculação expirou. Tente novamente.');
    const pending = await this.repository.consumeState(
      hashOauthValue(state),
      hashOauthValue(browserSecret),
    );
    if (!pending)
      throw new BadRequestException('A vinculação expirou ou já foi utilizada. Tente novamente.');
    if (denied || !code) throw new BadRequestException('A autorização do GitHub foi cancelada.');
    const tokens = await this.exchange({
      code,
      redirect_uri: config.redirectUri,
      code_verifier: decryptGithubToken(pending.codeVerifier, config.encryptionKey),
    });
    const scopes = tokens.scope?.split(/[ ,]+/) ?? [];
    if (!scopes.includes('read:user') && !scopes.includes('user'))
      throw new ForbiddenException('Autorize a leitura do perfil para concluir a vinculação.');
    const account = await this.account(tokens.access_token);
    try {
      await this.repository.save({
        userId: pending.userId,
        githubId: String(account.id),
        login: account.login,
        ...this.tokenFields(tokens),
        updatedAt: new Date(),
      });
    } catch (error) {
      const dbError = error as { code?: string; cause?: { code?: string } };
      if (dbError.code === '23505' || dbError.cause?.code === '23505')
        throw new BadRequestException('Esta conta do GitHub já está vinculada a outro usuário.');
      throw error;
    }
  }

  private tokenFields(tokens: z.infer<typeof tokenSchema>) {
    const { encryptionKey } = this.configuration();
    return {
      accessToken: encryptGithubToken(tokens.access_token, encryptionKey),
      refreshToken: tokens.refresh_token
        ? encryptGithubToken(tokens.refresh_token, encryptionKey)
        : null,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      refreshExpiresAt: tokens.refresh_token_expires_in
        ? new Date(Date.now() + tokens.refresh_token_expires_in * 1000)
        : null,
    };
  }

  async accessToken(userId: string): Promise<string> {
    const config = this.configuration();
    const row = await this.repository.find(userId);
    if (!row) throw new ForbiddenException(GITHUB_LINK_REQUIRED);
    if (!row.expiresAt || row.expiresAt.getTime() > Date.now() + 60_000)
      return decryptGithubToken(row.accessToken, config.encryptionKey);
    const active = this.refreshes.get(userId);
    if (active) return active;
    const refresh = this.refresh(userId);
    this.refreshes.set(userId, refresh);
    try {
      return await refresh;
    } finally {
      this.refreshes.delete(userId);
    }
  }

  private async refresh(userId: string): Promise<string> {
    const row = await this.repository.find(userId);
    if (
      !row?.refreshToken ||
      (row.refreshExpiresAt && row.refreshExpiresAt.getTime() <= Date.now())
    ) {
      await this.repository.remove(userId);
      throw new ForbiddenException(GITHUB_LINK_REQUIRED);
    }
    const tokens = await this.exchange({
      grant_type: 'refresh_token',
      refresh_token: decryptGithubToken(row.refreshToken, this.configuration().encryptionKey),
    });
    await this.repository.save({ ...row, ...this.tokenFields(tokens), updatedAt: new Date() });
    return tokens.access_token;
  }

  private async exchange(fields: Record<string, string>) {
    const config = this.configuration();
    const response = await this.request('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...fields,
      }),
    });
    const parsed = tokenSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new ForbiddenException('O GitHub recusou a autorização. Vincule sua conta novamente.');
    return parsed.data;
  }

  private async account(token: string) {
    const response = await this.request('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'AcerolaTicket',
      },
    });
    const parsed = accountSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new ServiceUnavailableException(
        'Não foi possível confirmar a conta do GitHub. Tente novamente.',
      );
    return parsed.data;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível falar com o GitHub. Tente novamente.',
      );
    }
    if (response.status === 401) throw new ForbiddenException(GITHUB_LINK_REQUIRED);
    if (!response.ok)
      throw new ServiceUnavailableException(
        'O GitHub está indisponível ou recusou o acesso. Tente novamente.',
      );
    return response;
  }
}
