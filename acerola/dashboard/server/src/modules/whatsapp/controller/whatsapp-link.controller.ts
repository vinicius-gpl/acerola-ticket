import { Controller, Delete, Get, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { WhatsappConnectionDto } from '../dto/whatsapp-connection.dto';
import { WhatsappLinkService } from '../service/whatsapp-link.service';
import { AnyModule } from '../../../lib/auth/module-context.decorator';

/**
 * O vínculo do WhatsApp de quem está logado.
 *
 * Nenhuma rota recebe o id de alguém: é sempre o da identidade. E nenhuma é `@Public()` — o QR
 * code que sai daqui é a chave para vincular um número, e só o dono da sessão pode vê-lo.
 */
@ApiTags('Vinculação WhatsApp')
@ApiBearerAuth('neon-auth')
@AnyModule()
@Controller('integrations/whatsapp')
export class WhatsappLinkController {
  constructor(private readonly service: WhatsappLinkService) {}

  @Get('status')
  /* O QR code muda a cada poucos segundos e é sensível: nunca fica em cache. */
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Situação do vínculo de WhatsApp do usuário atual',
    description:
      'Devolve se a integração está configurada, se a pessoa pode vincular e a situação: sem vínculo, esperando a leitura do QR code (com o conteúdo do QR code) ou conectado (com o número).',
  })
  @ApiOkResponse({ type: WhatsappConnectionDto })
  @ApiBadGatewayResponse({ description: 'O serviço de WhatsApp não respondeu.' })
  status(@CurrentUser() user: RequestUser): Promise<WhatsappConnectionDto> {
    return this.service.status(user);
  }

  @Post('link')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Começa o vínculo do WhatsApp do usuário atual',
    description:
      'Só administradores (super admin, ou admin de alguma área). O QR code fica disponível na situação alguns segundos depois.',
  })
  @ApiOkResponse({ type: WhatsappConnectionDto })
  @ApiForbiddenResponse({ description: 'Vincular o WhatsApp é uma ação de administrador.' })
  @ApiServiceUnavailableResponse({ description: 'A integração não foi configurada.' })
  @ApiBadGatewayResponse({ description: 'O serviço de WhatsApp não respondeu.' })
  link(@CurrentUser() user: RequestUser): Promise<WhatsappConnectionDto> {
    return this.service.link(user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desvincula o WhatsApp do usuário atual',
    description: 'Encerra a conexão no WhatsApp e apaga o que estava guardado.',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Vincular o WhatsApp é uma ação de administrador.' })
  unlink(@CurrentUser() user: RequestUser): Promise<void> {
    return this.service.unlink(user);
  }
}
