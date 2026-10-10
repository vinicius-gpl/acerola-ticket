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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QUOTE_ATTACHMENT_MAX_BYTES } from '@template/shared/domain/maintenance-quote.util';
import { uploadLimit } from '../../../lib/http/upload-limit.util';
import { UploadTooLargeInterceptor } from '../../../lib/http/upload-too-large.interceptor';
import {
  ApiBody,
  ApiConsumes,
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
  CreateMaintenanceQuoteDto,
  MaintenanceQuoteDto,
  MaintenanceQuoteListQueryDto,
  MaintenanceQuoteListResponseDto,
  UpdateMaintenanceQuoteDto,
} from '../dto/maintenance-quote.dto';
import {
  MaintenanceQuotesService,
  type UploadedAttachment,
} from '../service/maintenance-quotes.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão. Quem CONSULTA é qualquer pessoa identificada; quem MEXE
 * precisa de cargo de gestão em Manutenção — a conferência é do service.
 *
 * Guardar e alterar chegam como `multipart/form-data`, porque o documento viaja junto com os
 * campos: dois envios separados deixariam orçamento sem documento se o segundo falhasse.
 */
@ApiTags('Orçamentos da Manutenção')
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

  @Post()
  @UseInterceptors(
    UploadTooLargeInterceptor,
    FileInterceptor('attachment', uploadLimit(QUOTE_ATTACHMENT_MAX_BYTES)),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Guarda um orçamento feito com uma empresa de fora',
    description:
      'O documento é opcional e viaja no campo `attachment` (PDF ou imagem, até 10 MB). O valor vai em centavos.',
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
    @UploadedFile() attachment?: UploadedAttachment,
  ): Promise<MaintenanceQuoteDto> {
    return this.service.create(user, body, attachment);
  }

  @Patch(':id')
  @UseInterceptors(
    UploadTooLargeInterceptor,
    FileInterceptor('attachment', uploadLimit(QUOTE_ATTACHMENT_MAX_BYTES)),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Altera um orçamento da Manutenção',
    description:
      'Só o que vier no corpo muda. Um documento novo no campo `attachment` substitui o anterior; `removeAttachment` tira o que existe sem pôr outro.',
  })
  @ApiBody({ type: UpdateMaintenanceQuoteDto })
  @ApiOkResponse({ type: MaintenanceQuoteDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Orçamento não encontrado.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMaintenanceQuoteDto,
    @UploadedFile() attachment?: UploadedAttachment,
  ): Promise<MaintenanceQuoteDto> {
    return this.service.update(user, id, body, attachment);
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
