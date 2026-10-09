import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { type AuthenticatedRequest } from '../../lib/auth/request-user.type';
import { GithubOauthService, GITHUB_LINK_REQUIRED } from './service/github-oauth.service';
import { canEditSystem, requiresSystemGithub } from '@template/shared/domain/system-access.util';

@Injectable()
export class GithubLinkedGuard implements CanActivate {
  constructor(private readonly oauth: GithubOauthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, method } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { method: string }>();
    if (!user) throw new UnauthorizedException('Faça login para continuar.');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !canEditSystem(user)) {
      throw new ForbiddenException(
        'Somente administradores do módulo Sistema podem editar seus dados.',
      );
    }
    if (!requiresSystemGithub(user)) return true;
    const status = await this.oauth.status(user.id);
    if (!status.isLinked) throw new ForbiddenException(GITHUB_LINK_REQUIRED);
    return true;
  }
}
