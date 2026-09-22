import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { parseCookies } from '../../../lib/auth/cookie.util';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SESSION_COOKIE_NAME } from '../../../lib/auth/session-token.util';
import { LoginDto, SessionUserDto } from '../dto/auth.dto';
import { AuthService } from '../service/auth.service';

/**
 * Login próprio: e-mail e senha, nada mais (sem cadastro, sem provedor externo — CONTRIBUTING
 * §17). `/login` é `@Public()` de propósito: quem ainda não tem sessão precisa conseguir
 * chegar até aqui para abrir uma.
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Entra com e-mail e senha',
    description: 'Abre uma sessão e grava um cookie HttpOnly. Sem OAuth, sem outro provedor.',
  })
  @ApiOkResponse({ type: SessionUserDto })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha incorretos.' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUserDto> {
    return this.service.login(body.email, body.password, response);
  }

  /* Público também: uma sessão já expirada não deveria impedir a pessoa de limpar o cookie
     que sobrou dela. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sai da conta', description: 'Encerra a sessão e apaga o cookie.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE_NAME];
    await this.service.logout(token, response);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Quem está logado',
    description: 'Usada pela tela para saber se há sessão válida e para quem redirecionar.',
  })
  @ApiOkResponse({ type: SessionUserDto })
  @ApiUnauthorizedResponse({ description: 'Sem sessão válida.' })
  me(@CurrentUser() user: RequestUser): SessionUserDto {
    return user;
  }
}
