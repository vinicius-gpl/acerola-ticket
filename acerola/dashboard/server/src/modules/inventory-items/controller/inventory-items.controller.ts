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
  CreateInventoryItemDto,
  CreateInventoryMovementDto,
  InventoryItemDto,
  InventoryItemListQueryDto,
  InventoryItemListResponseDto,
  InventoryMovementDto,
  InventoryMovementListQueryDto,
  InventoryMovementListResponseDto,
  PhotoUploadRequestDto,
  PhotoUploadTicketDto,
  UpdateInventoryItemDto,
} from '../dto/inventory-item.dto';
import { SkipHistory } from '../../history/interceptor/skip-history.decorator';
import { InventoryItemsService } from '../service/inventory-items.service';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão. Quem CONSULTA é qualquer pessoa identificada; quem MEXE
 * precisa de cargo de gestão em Manutenção — a conferência é do service, no mesmo lugar onde
 * a escrita acontece.
 *
 * A foto NÃO passa por aqui: o navegador pede o link (`photo/upload-url`), envia direto para o
 * storage, e o cadastro leva só a chave dela — gravada junto com os campos, num envio só.
 */
@ApiTags('Inventário da Manutenção')
@ModuleContext('manutencao')
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly service: InventoryItemsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os produtos do inventário',
    description:
      'Por categoria e depois por nome. A busca procura no nome, no lugar onde fica e no código de patrimônio.',
  })
  @ApiOkResponse({ type: InventoryItemListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: InventoryItemListQueryDto,
  ): Promise<InventoryItemListResponseDto> {
    return this.service.list(user, query);
  }

  /* ANTES de `:id`, de propósito: o Nest casa as rotas na ordem em que aparecem, e depois
     dela `/inventory-items/movements` seria lido como "o produto de id movements". */
  @Get('movements')
  @ApiOperation({
    summary: 'Lista os movimentos do depósito da Manutenção',
    description:
      'Do mais novo para o mais velho. `type=disposal` devolve só os descartes; `itemId` devolve o extrato de um produto.',
  })
  @ApiOkResponse({ type: InventoryMovementListResponseDto })
  async movements(
    @CurrentUser() user: RequestUser,
    @Query() query: InventoryMovementListQueryDto,
  ): Promise<InventoryMovementListResponseDto> {
    return this.service.movements(user, query);
  }

  @Post(':id/movements')
  @ApiOperation({
    summary: 'Registra uma entrada, uma saída ou um descarte do produto',
    description:
      'Move o saldo do produto junto. Saída e descarte são recusados quando passam do que existe; o descarte exige o motivo.',
  })
  @ApiCreatedResponse({ type: InventoryMovementDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  @ApiUnprocessableEntityResponse({
    description: 'A quantidade passa do que existe no depósito, ou falta o motivo do descarte.',
  })
  async createMovement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateInventoryMovementDto,
  ): Promise<InventoryMovementDto> {
    return this.service.createMovement(user, id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre um produto do inventário' })
  @ApiOkResponse({ type: InventoryItemDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InventoryItemDto> {
    return this.service.findById(user, id);
  }

  @Post('photo/upload-url')
  @SkipHistory()
  @ApiOperation({
    summary: 'Pede o link para enviar a foto de um produto',
    description:
      'A foto vai do navegador DIRETO para o storage, por este link (PUT, assinado, vale 5 minutos), para a área temporária. Depois, o cadastro ou a alteração leva a `storageKey` no campo `photo`.',
  })
  @ApiCreatedResponse({ type: PhotoUploadTicketDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiUnprocessableEntityResponse({
    description: 'A foto não é uma imagem aceita, ou é grande demais.',
  })
  async createPhotoUploadUrl(
    @CurrentUser() user: RequestUser,
    @Body() body: PhotoUploadRequestDto,
  ): Promise<PhotoUploadTicketDto> {
    return this.service.createPhotoUploadTicket(user, body);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um produto no inventário',
    description:
      'A foto é opcional: já enviada pelo link de `photo/upload-url`, vai no campo `photo`. Ela é reduzida antes de ser guardada — o que fica no R2 é um webp de até 1024px de largura.',
  })
  @ApiBody({ type: CreateInventoryItemDto })
  @ApiCreatedResponse({ type: InventoryItemDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiUnprocessableEntityResponse({
    description: 'Algum campo está fora do contrato, ou a foto não é uma imagem aceita.',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Altera um produto do inventário',
    description:
      'Só o que vier no corpo muda. Uma foto nova (já enviada) no campo `photo` substitui a anterior; `removePhoto` tira a que existe sem pôr outra.',
  })
  @ApiBody({ type: UpdateInventoryItemDto })
  @ApiOkResponse({ type: InventoryItemDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um produto do inventário' })
  @ApiNoContentResponse({ description: 'Produto excluído.' })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}
