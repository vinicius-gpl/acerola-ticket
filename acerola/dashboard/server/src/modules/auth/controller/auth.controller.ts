import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SessionUserDto } from '../dto/auth.dto';

/**
 * A API NÃO FAZ LOGIN — quem faz é o Neon Auth, direto com a tela.
 *
 * Sobra um endpoint só, e ele existe por um motivo prático: o token diz quem a pessoa é, mas
 * não diz o PAPEL dela no sistema (isso é nosso, lido de `neon_auth.user` a cada
 * requisição). A tela pergunta aqui, uma vez, e com a mesma resposta descobre duas coisas:
 * se a sessão ainda vale (401 manda para o login) e o que mostrar no menu.
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
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
