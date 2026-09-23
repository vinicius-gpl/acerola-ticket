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
  CreateMovementDto,
  CreatePartDto,
  MovementListQueryDto,
  MovementListResponseDto,
  PartDto,
  PartListQueryDto,
  PartListResponseDto,
  PartMovementDto,
  UpdateMovementDto,
  UpdatePartDto,
} from '../dto/part.dto';
import { PartsService } from '../service/parts.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão — o depósito é do TI.
 *
 * As movimentações ficam em `/parts/movements` e `/parts/:id/movements`, e não num controller
 * próprio, porque não existem sem a peça: é o extrato dela.
 */
@ApiTags('Depósito')
@Controller('parts')
export class PartsController {
  constructor(private readonly service: PartsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as peças do depósito',
    description:
      'Por categoria e depois por nome — quem abre o depósito procura "os SSDs", não a peça cadastrada mais recentemente. O saldo vem junto de cada peça.',
  })
  @ApiOkResponse({ type: PartListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: PartListQueryDto,
  ): Promise<PartListResponseDto> {
    return this.service.list(user, query);
  }

  @Get('movements')
  @ApiOperation({
    summary: 'Lista as movimentações',
    description:
      'Da mais recente para a mais antiga. `partId` recorta o extrato de uma peça e `computerId` mostra o que uma máquina recebeu — é o que a ficha do computador usa.',
  })
  @ApiOkResponse({ type: MovementListResponseDto })
  async movements(
    @CurrentUser() user: RequestUser,
    @Query() query: MovementListQueryDto,
  ): Promise<MovementListResponseDto> {
    return this.service.movements(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre uma peça' })
  @ApiOkResponse({ type: PartDto })
  @ApiNotFoundResponse({ description: 'Peça não encontrada.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PartDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra uma peça',
    description:
      'A quantidade informada no cadastro vira a PRIMEIRA ENTRADA do extrato, e não um saldo solto: todo número da prateleira precisa ter uma linha que o explique.',
  })
  @ApiCreatedResponse({ type: PartDto })
  @ApiUnprocessableEntityResponse({ description: 'Algum campo está fora do contrato.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePartDto,
  ): Promise<PartDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Corrige o cadastro de uma peça',
    description: 'Descrição, categoria e condição. O saldo não se digita — ele vem do extrato.',
  })
  @ApiOkResponse({ type: PartDto })
  @ApiNotFoundResponse({ description: 'Peça não encontrada.' })
  @ApiForbiddenResponse({
    description: 'A peça foi cadastrada por outra pessoa e quem pediu não é gerente nem administrador.',
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePartDto,
  ): Promise<PartDto> {
    return this.service.update(user, id, body);
  }

  @Post(':id/movements')
  @ApiOperation({
    summary: 'Registra uma entrada ou uma saída',
    description:
      'O saldo se ajusta junto, na mesma transação. Saída maior do que o estoque é RECUSADA, com o número que existe na prateleira — prender o saldo em zero faria a tela mentir sobre o que há para pegar.',
  })
  @ApiCreatedResponse({ type: PartMovementDto })
  @ApiNotFoundResponse({ description: 'Peça não encontrada.' })
  @ApiUnprocessableEntityResponse({ description: 'A saída é maior do que o estoque.' })
  async createMovement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateMovementDto,
  ): Promise<PartMovementDto> {
    return this.service.createMovement(user, id, body);
  }

  @Patch('movements/:movementId')
  @ApiOperation({
    summary: 'Corrige quem pegou e a observação de uma movimentação',
    description:
      'Quantidade e tipo não se corrigem: mudá-los reescreveria o saldo de todas as linhas seguintes do extrato. Movimentação lançada errada se exclui.',
  })
  @ApiOkResponse({ type: PartMovementDto })
  @ApiNotFoundResponse({ description: 'Movimentação não encontrada.' })
  @ApiForbiddenResponse({ description: 'A movimentação é de outra pessoa.' })
  async updateMovement(
    @CurrentUser() user: RequestUser,
    @Param('movementId', ParseIntPipe) movementId: number,
    @Body() body: UpdateMovementDto,
  ): Promise<PartMovementDto> {
    return this.service.updateMovement(user, movementId, body);
  }

  @Delete('movements/:movementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma movimentação e devolve o saldo',
    description:
      'Desfaz o efeito da linha no estoque e refaz o extrato da peça, para a sequência de saldos continuar fechando.',
  })
  @ApiNoContentResponse({ description: 'Movimentação excluída e saldo devolvido.' })
  @ApiNotFoundResponse({ description: 'Movimentação não encontrada.' })
  @ApiForbiddenResponse({ description: 'A movimentação é de outra pessoa.' })
  async removeMovement(
    @CurrentUser() user: RequestUser,
    @Param('movementId', ParseIntPipe) movementId: number,
  ): Promise<void> {
    return this.service.removeMovement(user, movementId);
  }
}
