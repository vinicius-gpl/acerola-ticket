import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLE_LABELS, type UserRole } from '@template/shared/schemas/user.schema';

import { IS_PUBLIC } from './public.decorator';
import { type AuthenticatedRequest } from './request-user.type';
import { REQUIRED_ROLES } from './roles.decorator';

/**
 * "O que você pode" — em duas perguntas, nesta ordem.
 *
 * 1. **Está identificado?** O middleware só ANEXA identidade quando encontra uma; ele nunca
 *    recusa sozinho (ver `authentication.middleware.ts`). É aqui, e não lá, que "ninguém
 *    identificado" vira 401 — exceto em rota `@Public()`, que é o único jeito de alguém
 *    chegar em `/api/auth/login` sem já estar logado.
 * 2. **O papel serve para esta rota?** Só entra se `@Roles()` estiver presente.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Faça login para continuar.');

    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    if (required.includes(user.role)) return true;

    /* A mensagem diz qual perfil resolve. "Sem permissão" sozinho gera chamado; dizer o
       que falta deixa a pessoa pedir a coisa certa. */
    const labels = required.map((role) => USER_ROLE_LABELS[role]).join(' ou ');

    throw new ForbiddenException(`Esta ação é de ${labels}.`);
  }
}
