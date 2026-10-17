import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { CreateTicketHistoryDto, TicketHistoryDto } from '../dto/ticket-history.dto';
import { TicketHistoriesService } from '../service/ticket-histories.service';
import { AnyModule } from '../../../lib/auth/module-context.decorator';

/**
 * A LINHA DO TEMPO de um chamado — a ordem de serviço, pelo painel.
 *
 * Nenhuma rota aqui é `@Public()`: lançar histórico é atender, e atender exige identidade.
 * Quem abriu o chamado lê a parte visível da linha do tempo pela consulta por protocolo.
 *
 * Não há `@Patch` nem `@Delete`: histórico não se corrige nem se apaga. Errou? Lance outro.
 */
@ApiTags('Chamados')
@AnyModule()
@Controller('tickets/:id')
export class TicketHistoriesController {
  constructor(private readonly service: TicketHistoriesService) {}

  @Get('histories')
  @ApiOperation({
    summary: 'A linha do tempo de um chamado',
    description:
      'Todos os históricos, do mais antigo para o mais novo, cada um com os arquivos anexados junto dele.',
  })
  @ApiOkResponse({ type: [TicketHistoryDto] })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketHistoryDto[]> {
    return this.service.list(user, id);
  }

  @Post('histories')
  @ApiOperation({
    summary: 'Lança um histórico no chamado',
    description:
      'É o ÚNICO caminho que muda o estágio de um chamado: o estágio resultante é consequência do tipo do histórico. Os tipos que encerram (e a reabertura) exigem administrar alguma área do chamado. Os arquivos já foram enviados pelo link de `POST /tickets/:id/attachments/upload-url`; o campo `attachments` leva a `storageKey` e o nome de cada um.',
  })
  @ApiBody({ type: CreateTicketHistoryDto })
  @ApiCreatedResponse({ type: TicketHistoryDto })
  @ApiBadRequestResponse({ description: 'Algum arquivo está fora do formato ou do tamanho.' })
  @ApiUnprocessableEntityResponse({
    description: 'Este tipo de histórico não cabe no estágio em que o chamado está.',
  })
  @ApiForbiddenResponse({ description: 'O cargo de quem pediu não permite este histórico.' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTicketHistoryDto,
  ): Promise<TicketHistoryDto> {
    return this.service.create(user, id, body, body.attachments);
  }
}
