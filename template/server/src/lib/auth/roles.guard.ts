import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLE_LABELS, type UserRole } from '@template/shared/schemas/user.schema';

import { type AuthenticatedRequest } from './request-user.type';
import { REQUIRED_ROLES } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Faça login para continuar.');
    if (required.includes(user.role)) return true;

    /* A mensagem diz qual perfil resolve. "Sem permissão" sozinho gera chamado; dizer o
       que falta deixa a pessoa pedir a coisa certa. */
    const labels = required.map((role) => USER_ROLE_LABELS[role]).join(' ou ');

    throw new ForbiddenException(`Esta ação é de ${labels}.`);
  }
}
