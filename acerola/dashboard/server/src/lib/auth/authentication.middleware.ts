import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { IdentityProvider } from './identity.provider';
import { readBearerToken } from './neon-token.util';
import { type RequestUser } from './request-user.type';

/**
 * Autenticação: quem é você. Roda antes de tudo, em toda requisição da API.
 *
 * É middleware, e não guard, de propósito. Guard é sobre PERMISSÃO — ele já recebe a
 * requisição sabendo quem está pedindo. Aqui ainda não se sabe, e resolver identidade dentro
 * de um guard misturaria as duas perguntas num lugar só: a que vale para o sistema inteiro
 * ("tem alguém aí?") e a que muda por rota ("essa pessoa pode isto?").
 *
 * Este middleware NÃO recusa ninguém: ele só carimba na requisição quem conseguiu provar
 * quem é. Recusar é do `RolesGuard`, que é global e sabe quais rotas são públicas
 * (`@Public()`). Se a recusa morasse aqui, rota pública nenhuma conseguiria existir.
 */
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(private readonly identity: IdentityProvider) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const token = readBearerToken(request.headers.authorization);
    if (!token) return next();

    const user = await this.identity.resolve(token);
    if (user) attach(request, user);

    return next();
  }
}

function attach(request: Request, user: RequestUser): void {
  (request as Request & { user?: RequestUser }).user = user;
}
