import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { GithubOauthService, hashOauthValue } from '../service/github-oauth.service';

class GithubCallbackQuery extends createZodDto(
  z.object({
    code: z.string().max(2048).optional(),
    state: z.string().max(128).optional(),
    error: z.string().max(256).optional(),
  }),
) {}

function cookieName(state: string) {
  return `acerola_github_${hashOauthValue(state).slice(0, 16)}`;
}
function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

@ApiTags('Vinculação GitHub')
@Controller('integrations/github')
export class GithubIntegrationController {
  constructor(private readonly service: GithubOauthService) {}

  @Get('status')
  @ApiOperation({ summary: 'Confere o vínculo GitHub do usuário atual' })
  status(@CurrentUser() user: RequestUser) {
    return this.service.status(user.id);
  }

  @Post('authorize')
  @ApiOperation({ summary: 'Inicia a vinculação OAuth da conta autenticada' })
  async authorize(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.begin(user.id);
    response.cookie(cookieName(result.state), result.browserSecret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/integrations/github',
      maxAge: 10 * 60_000,
    });
    response.setHeader('Cache-Control', 'no-store');
    return { url: result.url };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Valida o retorno do GitHub e abre o painel Sistema' })
  async callback(
    @Query() query: GithubCallbackQuery,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const name = cookieName(query.state ?? '');
    const browserSecret = readCookie(request, name);
    response.clearCookie(name, {
      path: '/api/integrations/github',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.setHeader('Cache-Control', 'no-store');
    try {
      await this.service.complete(query.code, query.state, browserSecret, query.error);
    } catch {
      return response.redirect(
        303,
        this.service.frontendRedirect(query.error === 'access_denied' ? 'cancelled' : 'failed'),
      );
    }
    return response.redirect(303, this.service.frontendRedirect());
  }
}
