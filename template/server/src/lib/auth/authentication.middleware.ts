import { Injectable, UnauthorizedException, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { hasForwardedHeaders, MOCK_IDENTITY, readForwardedIdentity } from './identity.provider';
import { type RequestUser } from './request-user.type';

/**
 * Autenticação: quem é você. Roda antes de tudo, em toda requisição da API.
 *
 * É middleware, e não guard, de propósito. Guard é sobre PERMISSÃO — ele já recebe a
 * requisição sabendo quem está pedindo. Aqui ainda não se sabe, e resolver identidade dentro
 * de um guard misturaria as duas perguntas num lugar só: a que vale para o sistema inteiro
 * ("tem alguém aí?") e a que muda por rota ("essa pessoa pode isto?").
 *
 * O middleware NÃO deixa passar sem identidade — nem hoje, com o mock. Uma requisição sem
 * ninguém carimbaria `createdBy` vazio, e a pergunta "quem fez isso?" ficaria sem resposta
 * para sempre. Enquanto não há provedor, a identidade é a pessoa fixa do mock; quando houver,
 * ela vem dos cabeçalhos. Não passar nunca foi opção.
 */
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const identity = readForwardedIdentity(request.headers);

    if (identity) {
      attach(request, identity);

      return next();
    }

    /* Cabeçalho veio e não formou identidade válida: o provedor está mal configurado. Cair
       no mock aqui daria acesso de ADMINISTRADOR a uma requisição que o provedor não soube
       identificar — o furo mais caro que este arquivo pode ter. */
    if (hasForwardedHeaders(request.headers)) {
      throw new UnauthorizedException(
        'A identidade encaminhada está incompleta ou inválida. Fale com quem administra o acesso.',
      );
    }

    attach(request, MOCK_IDENTITY);

    return next();
  }
}

function attach(request: Request, identity: RequestUser | Omit<RequestUser, never>): void {
  (request as Request & { user?: RequestUser }).user = identity;
}
