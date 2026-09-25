import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateTransferDto,
  InstalledPartListDto,
  TransferDto,
  TransferListDto,
} from '../dto/transfer.dto';
import { TransfersService } from '../service/transfers.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * As rotas penduram na máquina (`/computers/:computerId/transfers`) porque transferência não
 * existe sozinha: ela é sempre a mudança DE UMA máquina, e a ficha dela é o único lugar de
 * onde se chega aqui.
 *
 * Quem transferiu vem da identidade autenticada, nunca do corpo (CONTRIBUTING §8). O campo
 * `responsible` é outra coisa: é quem levou a máquina, e pode ser alguém sem login.
 */
@ApiTags('Transferências')
@Controller('computers/:computerId/transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  @ApiOperation({
    summary: 'Por onde esta máquina andou',
    description: 'O histórico de mudanças de departamento, do mais recente para o mais antigo.',
  })
  @ApiOkResponse({ type: TransferListDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('computerId', ParseIntPipe) computerId: number,
  ): Promise<TransferListDto> {
    return this.service.listByComputer(user, computerId);
  }

  @Get('installed-parts')
  @ApiOperation({
    summary: 'As peças que estão nesta máquina hoje',
    description:
      'O que saiu do depósito para ela e não voltou. É a lista que a transferência usa para perguntar o que vai junto e o que fica na estação.',
  })
  @ApiOkResponse({ type: InstalledPartListDto })
  async installedParts(
    @CurrentUser() user: RequestUser,
    @Param('computerId', ParseIntPipe) computerId: number,
  ): Promise<InstalledPartListDto> {
    return this.service.installedParts(user, computerId);
  }

  @Post()
  @ApiOperation({
    summary: 'Transferir a máquina de departamento',
    description:
      'Registra a mudança no histórico, muda o departamento da ficha e move os periféricos que ficaram na estação. Destino nulo devolve a máquina para a prateleira, como reserva.',
  })
  @ApiCreatedResponse({ type: TransferDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('computerId', ParseIntPipe) computerId: number,
    @Body() body: CreateTransferDto,
  ): Promise<TransferDto> {
    return this.service.create(user, computerId, body);
  }
}
