import { Injectable, UnauthorizedException, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { parseCookies } from './cookie.util';
import { hasForwardedHeaders, readForwardedIdentity } from './identity.provider';
import { type RequestUser } from './request-user.type';
import { SessionRepository } from './session.repository';
import { SESSION_COOKIE_NAME } from './session-token.util';

/**
 * Autenticação: quem é você, se alguém. Roda antes de tudo, em toda requisição da API.
 *
 * É middleware, e não guard, de propósito. Guard é sobre PERMISSÃO — ele já recebe a
 * requisição sabendo quem está pedindo. Aqui ainda não se sabe, e resolver identidade dentro
 * de um guard misturaria as duas perguntas num lugar só: a que vale para o sistema inteiro
 * ("tem alguém aí?") e a que muda por rota ("essa pessoa pode isto?").
 *
 * Duas origens de identidade, nesta ordem, e a primeira que bater vence:
 *
 *  1. **Cookie de sessão** (login próprio).
 *  2. **Cabeçalhos encaminhados** (`auth-forward`) — quando o projeto está atrás de um proxy
 *     que já autentica.
 *
 * SEM identidade, o middleware NÃO recusa mais sozinho — ele só deixa `request.user` vazio.
 * Quem decide se isso é um problema é o `RolesGuard`: rota com `@Public()` (como
 * `/api/auth/login`) segue sem identidade nenhuma; qualquer outra rota, sem identidade, o
 * guard responde 401. Recusar aqui, no middleware, bloquearia até a própria rota de login.
 */
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionRepository) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE_NAME];
    if (token) {
      const identity = await this.sessions.findIdentityByToken(token);
      if (identity) {
        attach(request, identity);

        return next();
      }
      /* Cookie presente mas a sessão não bate com nada válido (expirada, encerrada, forjada):
         cai para a próxima origem, e não direto para "sem identidade" — um `auth-forward`
         configurado ao lado do login próprio continua funcionando. */
    }

    const forwardedIdentity = readForwardedIdentity(request.headers);
    if (forwardedIdentity) {
      attach(request, forwardedIdentity);

      return next();
    }

    /* Cabeçalho veio e não formou identidade válida: o provedor está mal configurado. Isto
       SEMPRE é erro, mesmo numa rota `@Public()` — um proxy que manda cabeçalho quebrado é um
       problema de infraestrutura que vale a pena aparecer alto, não silenciar. */
    if (hasForwardedHeaders(request.headers)) {
      throw new UnauthorizedException(
        'A identidade encaminhada está incompleta ou inválida. Fale com quem administra o acesso.',
      );
    }

    next();
  }
}

function attach(request: Request, identity: RequestUser): void {
  (request as Request & { user?: RequestUser }).user = identity;
}
