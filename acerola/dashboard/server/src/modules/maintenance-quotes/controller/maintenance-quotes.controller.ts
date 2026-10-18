import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  AttachmentUploadRequestDto,
  AttachmentUploadTicketDto,
  CreateMaintenanceQuoteDto,
  MaintenanceQuoteDto,
  MaintenanceQuoteListQueryDto,
  MaintenanceQuoteListResponseDto,
  UpdateMaintenanceQuoteDto,
} from '../dto/maintenance-quote.dto';
import { SkipHistory } from '../../history/interceptor/skip-history.decorator';
import { MaintenanceQuotesService } from '../service/maintenance-quotes.service';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão. Quem CONSULTA é qualquer pessoa identificada; quem MEXE
 * precisa de cargo de gestão em Manutenção — a conferência é do service.
 *
 * O documento NÃO passa por aqui: o navegador pede o link (`attachment/upload-url`), envia
 * direto para o storage, e o orçamento leva só a chave dele — gravada junto com os campos.
 */
@ApiTags('Orçamentos da Manutenção')
@ModuleContext('manutencao')
@Controller('maintenance-quotes')
export class MaintenanceQuotesController {
  constructor(private readonly service: MaintenanceQuotesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os orçamentos da Manutenção',
    description:
      'Do mais recente para o mais antigo. A busca procura na empresa e na descrição do que foi orçado.',
  })
  @ApiOkResponse({ type: MaintenanceQuoteListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: MaintenanceQuoteListQueryDto,
  ): Promise<MaintenanceQuoteListResponseDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre um orçamento da Manutenção' })
  @ApiOkResponse({ type: MaintenanceQuoteDto })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceQuoteDto> {
    return this.service.findById(user, id);
  }

  @Post('attachment/upload-url')
  @SkipHistory()
  @ApiOperation({
    summary: 'Pede o link para enviar o documento de um orçamento',
    description:
      'O documento vai do navegador DIRETO para o storage, por este link (PUT, assinado, vale 5 minutos), para a área temporária. Depois, guardar ou alterar o orçamento leva a `storageKey` no campo `attachment`.',
  })
  @ApiCreatedResponse({ type: AttachmentUploadTicketDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiUnprocessableEntityResponse({
    description: 'O documento não é PDF ou imagem, ou é grande demais.',
  })
  async createAttachmentUploadUrl(
    @CurrentUser() user: RequestUser,
    @Body() body: AttachmentUploadRequestDto,
  ): Promise<AttachmentUploadTicketDto> {
    return this.service.createAttachmentUploadTicket(user, body);
  }

  @Post()
  @ApiOperation({
    summary: 'Guarda um orçamento feito com uma empresa de fora',
    description:
      'O documento é opcional: já enviado pelo link de `attachment/upload-url`, vai no campo `attachment` (PDF ou imagem, até 10 MB). O valor vai em centavos.',
  })
  @ApiBody({ type: CreateMaintenanceQuoteDto })
  @ApiCreatedResponse({ type: MaintenanceQuoteDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiUnprocessableEntityResponse({
    description: 'Algum campo está fora do contrato, ou o documento não é um arquivo aceito.',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateMaintenanceQuoteDto,
  ): Promise<MaintenanceQuoteDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Altera um orçamento da Manutenção',
    description:
      'Só o que vier no corpo muda. Um documento novo (já enviado) no campo `attachment` substitui o anterior; `removeAttachment` tira o que existe sem pôr outro.',
  })
  @ApiBody({ type: UpdateMaintenanceQuoteDto })
  @ApiOkResponse({ type: MaintenanceQuoteDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMaintenanceQuoteDto,
  ): Promise<MaintenanceQuoteDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um orçamento da Manutenção' })
  @ApiNoContentResponse({ description: 'Orçamento excluído.' })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}
