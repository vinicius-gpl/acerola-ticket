import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasModule } from '@template/shared/domain/module-access.util';
import { roleContextLabel, type RoleContext } from '@template/shared/domain/role-context.util';
import { USER_ROLE_LABELS, type UserRole } from '@template/shared/schemas/user.schema';

import { ANY_MODULE, MODULE_CONTEXT } from './module-context.decorator';
import { IS_PUBLIC } from './public.decorator';
import { type AuthenticatedRequest, type RequestUser } from './request-user.type';
import { REQUIRED_ROLES } from './roles.decorator';

/**
 * A TRANCA da API, em três perguntas:
 *
 *  1. **Tem alguém aí?** Sem identidade resolvida pelo middleware, 401 — a tela sabe que 401
 *     significa "faça login" e manda a pessoa para a tela de entrada.
 *  2. **A pessoa tem este módulo?** A rota declara o módulo (`@ModuleContext()`); sem ele, 403.
 *  3. **O papel serve?** Só quando a rota pede papel com `@Roles()`.
 *
 * Passada a tranca do módulo, o papel da requisição vira o nível DAQUELE módulo: o service
 * continua perguntando `user.role` (Usuário cria e cuida do que é seu, Gestor mexe no dos
 * outros, Administrador ajusta — ver `access.policy.ts`) e recebe a resposta certa para o
 * módulo em que está, sem saber que existem outros.
 *
 * O guard é global para que rota nova nasça protegida, e rota nasce FECHADA: sem
 * `@ModuleContext()`, sem `@AnyModule()` e sem `@Roles()`, 403. Abrir exceção exige escrever
 * uma linha que aparece na revisão — o inverso faria rota nova nascer aberta, e ninguém
 * revisa a ausência de algo. O super-admin passa por tudo.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.readMetadata<boolean>(IS_PUBLIC, context)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Faça login para continuar.');

    const moduleContext = this.readMetadata<RoleContext>(MODULE_CONTEXT, context);
    if (moduleContext) {
      request.user = scopeToModule(user, moduleContext);
    }

    return this.checkRoles(request.user ?? user, context, Boolean(moduleContext));
  }

  private checkRoles(
    user: RequestUser,
    context: ExecutionContext,
    hasModuleRule: boolean,
  ): boolean {
    const required = this.readMetadata<UserRole[]>(REQUIRED_ROLES, context);
    if (!required?.length) return this.requireDeclaredScope(context, hasModuleRule);

    if (user.role === 'superadmin') return true;
    if (required.includes(user.role)) return true;

    /* A mensagem diz qual perfil resolve. "Sem permissão" sozinho gera chamado; dizer o
       que falta deixa a pessoa pedir a coisa certa. */
    const labels = required.map((role) => USER_ROLE_LABELS[role]).join(' ou ');
    throw new ForbiddenException(`Esta ação é de ${labels}.`);
  }

  private requireDeclaredScope(context: ExecutionContext, hasModuleRule: boolean): boolean {
    if (hasModuleRule || this.readMetadata<boolean>(ANY_MODULE, context)) return true;

    throw new ForbiddenException('Esta rota não declara a que módulo pertence.');
  }

  private readMetadata<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(key, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

/**
 * Confere o módulo e devolve a pessoa com o nível DAQUELE módulo. O super-admin sai intacto.
 */
function scopeToModule(user: RequestUser, context: RoleContext): RequestUser {
  if (user.role === 'superadmin') return user;

  if (!hasModule(user, context)) {
    throw new ForbiddenException(
      `Você não tem acesso ao módulo ${roleContextLabel(context)}. Peça a liberação ao super-admin.`,
    );
  }

  return { ...user, role: user.roles?.[context] ?? 'user' };
}
