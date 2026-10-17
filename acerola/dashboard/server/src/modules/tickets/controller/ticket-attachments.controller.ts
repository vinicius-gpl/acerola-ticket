import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SkipHistory } from '../../history/interceptor/skip-history.decorator';
import {
  AttachFilesDto,
  TicketAttachmentDto,
  UploadRequestDto,
  UploadTicketDto,
} from '../dto/ticket-attachment.dto';
import { TicketAttachmentsService } from '../service/ticket-attachments.service';
import { AnyModule } from '../../../lib/auth/module-context.decorator';

/**
 * Os ANEXOS de um chamado, pelo painel.
 *
 * Estas rotas são do PAINEL, e isso é a decisão de segurança da feature: protocolo é
 * sequencial, e um caminho de exclusão aberto a quem pede deixaria quem chutasse um número
 * apagar arquivo de chamado alheio. Quem abre o chamado anexa junto com a abertura (ver
 * `POST /tickets`) e vê os arquivos na consulta por número — só não mexe neles depois.
 */
@ApiTags('Chamados')
@AnyModule()
@Controller('tickets/:id/attachments')
export class TicketAttachmentsController {
  constructor(private readonly service: TicketAttachmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os anexos de um chamado',
    description:
      'Cada anexo vem com dois endereços temporários: `viewUrl` abre o arquivo no navegador e `downloadUrl` o entrega como download, com o nome original.',
  })
  @ApiOkResponse({ type: [TicketAttachmentDto] })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketAttachmentDto[]> {
    return this.service.listForUser(user, id);
  }

  @Post('upload-url')
  @SkipHistory()
  @ApiOperation({
    summary: 'Pede o link para enviar um arquivo a um chamado',
    description:
      'O arquivo vai do navegador DIRETO para o storage, por este link (PUT, assinado, vale 5 minutos), para a área temporária. Depois, `POST /tickets/:id/attachments` (ou o histórico) leva a `storageKey`. Só quem atende o chamado recebe o link.',
  })
  @ApiCreatedResponse({ type: UploadTicketDto })
  @ApiBadRequestResponse({ description: 'O arquivo está fora do formato ou do tamanho aceito.' })
  @ApiForbiddenResponse({ description: 'Quem pediu não atende chamados.' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async createUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UploadRequestDto,
  ): Promise<UploadTicketDto> {
    return this.service.createUploadTicket(user, id, body);
  }

  @Post()
  @ApiOperation({
    summary: 'Anexa arquivos a um chamado',
    description:
      'Os arquivos já foram enviados pelo link de `upload-url`; o corpo leva a `storageKey` e o nome de cada um em `attachments`. O servidor confere cada arquivo de verdade (formato, tamanho, quantidade — PDF, Word, Excel, PNG/JPG e MP4). Um arquivo fora das regras recusa a leva inteira, dizendo qual e por quê.',
  })
  @ApiCreatedResponse({ type: [TicketAttachmentDto] })
  @ApiBadRequestResponse({
    description: 'Algum arquivo está fora do formato, do tamanho ou da quantidade aceita.',
  })
  @ApiNotFoundResponse({
    description: 'Chamado não encontrado, ou algum arquivo não chegou ao armazenamento.',
  })
  async attach(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AttachFilesDto,
  ): Promise<TicketAttachmentDto[]> {
    return this.service.attachAsUser(user, id, body.attachments);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um anexo',
    description: 'Tira o arquivo do chamado e do armazenamento. Não há como desfazer.',
  })
  @ApiNoContentResponse({ description: 'Anexo excluído.' })
  @ApiNotFoundResponse({ description: 'Chamado ou anexo não encontrado.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<void> {
    return this.service.remove(user, id, attachmentId);
  }
}
