import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type SessionUser } from '@template/shared/schemas/user.schema';
import { type Response } from 'express';

import { ENV } from '../../../lib/config/env.token';
import { type Env } from '../../../lib/config/env.schema';
import { verifyPassword } from '../../../lib/auth/password.util';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '../../../lib/auth/session-token.util';
import { toSessionUser } from '../mapper/auth.mapper';
import { AuthRepository } from '../repository/auth.repository';

/**
 * A MESMA mensagem para "e-mail não existe" e "senha errada" — de propósito.
 *
 * Mensagens diferentes confirmariam para quem está tentando adivinhar que um e-mail
 * específico tem conta no sistema. É a diferença entre "senha errada" (vaza que a conta
 * existe) e "e-mail ou senha incorretos" (não vaza nada).
 */
const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async login(email: string, password: string, response: Response): Promise<SessionUser> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.repository.createSession({ id: token, userId: user.id, expiresAt });

    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      /* `secure` exige HTTPS — e em desenvolvimento, http://localhost, o cookie nunca sairia
         do navegador se isto fosse `true` sempre. */
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return toSessionUser(user);
  }

  async logout(token: string | undefined, response: Response): Promise<void> {
    if (token) await this.repository.deleteSession(token);

    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }
}
