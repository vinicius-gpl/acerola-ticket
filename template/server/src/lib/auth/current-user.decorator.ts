import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, type RequestUser } from './request-user.type';

/**
 * Entrega quem está na requisição, já resolvido pelo middleware.
 *
 * É a única forma de um service saber quem está agindo. A alternativa — receber `createdBy`
 * no corpo — é o que permite assinar por outra pessoa.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new UnauthorizedException('Faça login para continuar.');

    return request.user;
  },
);
