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
  InventoryItemDto,
  InventoryItemListQueryDto,
  InventoryItemListResponseDto,
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
