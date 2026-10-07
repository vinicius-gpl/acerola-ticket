import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { AuthConfigDto, SessionUserDto } from '../dto/auth.dto';

/**
 * A API NÃO FAZ LOGIN — quem faz é o Neon Auth, direto com a tela.
 *
 * Entrega a configuração pública do Neon Auth e a pergunta "quem sou eu", com o PAPEL da
 * pessoa no sistema (isso é nosso, lido de `neon_auth.user` a cada requisição).
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get('config')
  @Public()
  @ApiOperation({
    summary: 'Configuração pública de autenticação',
    description: 'Entrega a URL do Neon Auth para a tela inicializar o cliente de login quando não estiver no bundle.',
  })
  @ApiOkResponse({ type: AuthConfigDto })
  config(): AuthConfigDto {
    return { neonAuthUrl: this.env.NEON_AUTH_URL };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Quem está logado agora',
    description: 'Identidade conferida pelo token do Neon Auth, com o papel lido do cadastro.',
  })
  @ApiOkResponse({ type: SessionUserDto })
  @ApiUnauthorizedResponse({ description: 'Sem token válido — a tela manda fazer login.' })
  me(@CurrentUser() user: RequestUser): SessionUserDto {
    return user;
  }
}
