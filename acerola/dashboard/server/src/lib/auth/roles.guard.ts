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
 * A TRANCA da API, em duas perguntas:
 *
 *  1. **Tem alguém aí?** Sem identidade resolvida pelo middleware, 401 — a tela sabe que 401
 *     significa "faça login" e manda a pessoa para a tela de entrada.
 *  2. **Essa pessoa pode isto?** Só quando a rota pede papel com `@Roles()`. Sem papel
 *     exigido, estar identificado basta.
 *
 * O guard é global para que rota nova nasça protegida. Abrir exceção exige escrever
 * `@Public()` — uma linha que aparece na revisão. O inverso faria rota nova nascer aberta, e
 * ninguém revisa a ausência de algo.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.readMetadata<boolean>(IS_PUBLIC, context)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Faça login para continuar.');

    const required = this.readMetadata<UserRole[]>(REQUIRED_ROLES, context);
    if (!required?.length) return true;
    if (required.includes(user.role)) return true;

    /* A mensagem diz qual perfil resolve. "Sem permissão" sozinho gera chamado; dizer o
       que falta deixa a pessoa pedir a coisa certa. */
    const labels = required.map((role) => USER_ROLE_LABELS[role]).join(' ou ');

    throw new ForbiddenException(`Esta ação é de ${labels}.`);
  }

  private readMetadata<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(key, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
