import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { TicketAttachmentDto } from '../dto/ticket-attachment.dto';
import {
  TicketAttachmentsService,
  type UploadedAttachment,
} from '../service/ticket-attachments.service';

/**
 * Quantos arquivos cabem numa requisição.
 *
 * É a soma dos tetos do catálogo, com folga: o limite de verdade é por formato e quem o aplica
 * é o domínio. Este número existe só para o interceptor não aceitar um envio de mil arquivos
 * antes de qualquer regra ser consultada.
 */
const MAX_FILES_PER_REQUEST = 25;

/**
 * Os ANEXOS de um chamado, pelo painel.
 *
 * Nenhuma rota aqui é `@Public()`, e isso é a decisão de segurança da feature: a consulta
 * pública é por protocolo, e protocolo é sequencial. Se excluir fosse público, quem chutasse
 * um número apagaria arquivo de chamado alheio. Quem abre o chamado anexa junto com a
 * abertura (ver `POST /tickets`) e vê os arquivos na consulta por protocolo — só não mexe
 * neles depois.
 */
@ApiTags('Chamados')
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

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', MAX_FILES_PER_REQUEST))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Anexa arquivos a um chamado',
    description:
      'Os arquivos viajam no campo `attachments`. Cada formato tem o teto dele, de tamanho e de quantidade — PDF, Word, Excel, PNG/JPG e MP4. Um arquivo fora das regras recusa a requisição inteira, dizendo qual e por quê.',
  })
  @ApiCreatedResponse({ type: [TicketAttachmentDto] })
  @ApiBadRequestResponse({
    description: 'Algum arquivo está fora do formato, do tamanho ou da quantidade aceita.',
  })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async attach(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() attachments?: UploadedAttachment[],
  ): Promise<TicketAttachmentDto[]> {
    return this.service.attachAsUser(user, id, attachments ?? []);
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
