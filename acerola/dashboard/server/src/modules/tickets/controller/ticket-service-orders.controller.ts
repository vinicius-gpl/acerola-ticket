import { Controller, Get, Param, ParseIntPipe, Post, Res, StreamableFile } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { PublicServiceOrderDto } from '../dto/service-order.dto';
import { TicketServiceOrdersService } from '../service/ticket-service-orders.service';

/**
 * A ORDEM DE SERVIÇO como documento: emitir (pelo painel) e conferir (por qualquer pessoa).
 *
 * Emitir é `POST`, e não `GET`: a emissão REGISTRA algo — a impressão digital do arquivo que
 * saiu. A conferência é `@Public()` de propósito: quem recebe o papel não tem conta no painel.
 * Ela só lê, e devolve o mínimo (ver `publicServiceOrderSchema`).
 *
 * Não há `@Patch` nem `@Delete`: emissão não se corrige nem se apaga.
 */
@ApiTags('Chamados')
@Controller()
export class TicketServiceOrdersController {
  constructor(private readonly service: TicketServiceOrdersService) {}

  @Post('tickets/:id/service-order')
  @ApiOperation({
    summary: 'Emite a ordem de serviço do chamado',
    description:
      'Devolve o PDF e registra a impressão digital (SHA-256) dele — o arquivo em si não é guardado. Quando nada mudou no chamado desde a última emissão, devolve o mesmo documento, sem versão nova. Exige cargo em alguma área do chamado.',
  })
  @ApiProduces('application/pdf')
  @ApiCreatedResponse({ description: 'O PDF da ordem de serviço, pronto para baixar.' })
  @ApiForbiddenResponse({ description: 'A pessoa não tem cargo em nenhuma área deste chamado.' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async issue(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const report = await this.service.issue(user, id);

    res.set({
      'Content-Type': report.contentType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
    });

    return new StreamableFile(report.buffer);
  }

  @Get('service-orders/:reference')
  @Public()
  @ApiOperation({
    summary: 'Confere uma ordem de serviço emitida (público)',
    description:
      'Não exige login. Aceita o código inteiro da emissão ou a versão curta impressa no rodapé. Devolve só o que serve para conferir o papel: protocolo, versão, data, estágio na emissão e a impressão digital do arquivo. Nada é gravado.',
  })
  @ApiOkResponse({ type: PublicServiceOrderDto })
  @ApiNotFoundResponse({ description: 'Nenhuma ordem de serviço com este código.' })
  async verify(@Param('reference') reference: string): Promise<PublicServiceOrderDto> {
    return this.service.verify(reference);
  }
}
