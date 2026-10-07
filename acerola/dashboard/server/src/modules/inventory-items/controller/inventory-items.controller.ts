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
  CreateInventoryItemDto,
  CreateInventoryMovementDto,
  InventoryItemDto,
  InventoryItemListQueryDto,
  InventoryItemListResponseDto,
  InventoryMovementDto,
  InventoryMovementListQueryDto,
  InventoryMovementListResponseDto,
  UpdateInventoryItemDto,
} from '../dto/inventory-item.dto';
import {
  InventoryItemsService,
  type UploadedPhoto,
} from '../service/inventory-items.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão. Quem CONSULTA é qualquer pessoa identificada; quem MEXE
 * precisa de cargo de gestão em Manutenção — a conferência é do service, no mesmo lugar onde
 * a escrita acontece.
 *
 * O cadastro e a alteração chegam como `multipart/form-data`, porque a foto viaja junto com
 * os campos: dois envios separados deixariam produto sem foto na tela se o segundo falhasse.
 */
@ApiTags('Inventário da Manutenção')
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

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Cadastra um produto no inventário',
    description:
      'A foto é opcional e viaja no campo `photo`. Ela é reduzida antes de ser guardada — o que fica no R2 é um webp de até 1024px de largura.',
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
    @UploadedFile() photo?: UploadedPhoto,
  ): Promise<InventoryItemDto> {
    return this.service.create(user, body, photo);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Altera um produto do inventário',
    description:
      'Só o que vier no corpo muda. Uma foto nova no campo `photo` substitui a anterior; `removePhoto` tira a que existe sem pôr outra.',
  })
  @ApiBody({ type: UpdateInventoryItemDto })
  @ApiOkResponse({ type: InventoryItemDto })
  @ApiForbiddenResponse({ description: 'Seu cargo em Manutenção só permite consultar.' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInventoryItemDto,
    @UploadedFile() photo?: UploadedPhoto,
  ): Promise<InventoryItemDto> {
    return this.service.update(user, id, body, photo);
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
