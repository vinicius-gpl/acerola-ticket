import { timingSafeEqual } from 'node:crypto';

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../lib/auth/public.decorator';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { SkipHistory } from '../../history/interceptor/skip-history.decorator';
import { InboundMessageDto, InboundReplyDto } from '../dto/inbound.dto';
import { WhatsappIntakeService } from '../service/whatsapp-intake.service';

/**
 * A porta por onde o BOT avisa o servidor de uma mensagem que chegou.
 *
 * É `@Public()` porque quem chama não é uma pessoa logada: é o bot, que se identifica com o
 * mesmo `BOT_API_TOKEN` que o servidor usa para chamá-lo. Sem esse token (ou com a integração
 * desligada), a rota não existe para ninguém.
 *
 * Fica fora do Swagger de propósito: não é API para a tela nem para terceiros. E fora do
 * histórico: cada mensagem de cada conversa passa por aqui.
 */
@ApiTags('Vinculação WhatsApp')
@Controller('integrations/whatsapp/inbound')
export class WhatsappIntakeController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly service: WhatsappIntakeService,
  ) {}

  @Post()
  @Public()
  @SkipHistory()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  handle(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: InboundMessageDto,
  ): Promise<InboundReplyDto> {
    if (!isBot(authorization, this.env.BOT_API_TOKEN)) throw new UnauthorizedException();

    return this.service.handle(body);
  }
}

/* Comparação em tempo constante, como no bot: `===` deixaria medir o token pelo tempo de resposta. */
export function isBot(authorization: string | undefined, token: string | undefined): boolean {
  if (!token) return false;

  const presented = Buffer.from(authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);

  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
