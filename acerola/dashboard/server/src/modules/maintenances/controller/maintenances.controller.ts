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
  CreateMaintenanceDto,
  MaintenanceDto,
  MaintenanceListQueryDto,
  MaintenanceListResponseDto,
  PreventiveDueDto,
  UpdateMaintenanceDto,
} from '../dto/maintenance.dto';
import { MaintenancesService } from '../service/maintenances.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão — o histórico de manutenção é do TI.
 */
@ApiTags('Manutenções')
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly service: MaintenancesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as manutenções',
    description:
      'Da mais recente para a mais antiga. `computerId` recorta o histórico de uma máquina — é o que a ficha do computador usa.',
  })
  @ApiOkResponse({ type: MaintenanceListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: MaintenanceListQueryDto,
  ): Promise<MaintenanceListResponseDto> {
    return this.service.list(user, query);
  }

  @Get('preventive')
  @ApiOperation({
    summary: 'A situação da manutenção preventiva de cada máquina',
    description:
      'Cruza o inventário com o histórico: quando cada máquina foi aberta pela última vez e se ela passou dos três meses. É calculado a cada consulta, nunca guardado — como campo, uma máquina ficaria presa em "em dia" para sempre. As arquivadas ficam de fora.',
  })
  @ApiOkResponse({ type: [PreventiveDueDto] })
  async preventive(@CurrentUser() user: RequestUser): Promise<PreventiveDueDto[]> {
    return this.service.preventive(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre uma manutenção' })
  @ApiOkResponse({ type: MaintenanceDto })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra uma manutenção',
    description:
      'Em uma máquina do inventário ou num equipamento de fora, nomeado à mão — um dos dois é obrigatório. A data é a do SERVIÇO, que não é a de hoje quando alguém lança na segunda-feira o que fez no sábado.',
  })
  @ApiCreatedResponse({ type: MaintenanceDto })
  @ApiUnprocessableEntityResponse({ description: 'Algum campo está fora do contrato.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateMaintenanceDto,
  ): Promise<MaintenanceDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige uma manutenção registrada' })
  @ApiOkResponse({ type: MaintenanceDto })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  @ApiForbiddenResponse({
    description: 'O registro é de outra pessoa e quem pediu não é gerente nem administrador.',
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMaintenanceDto,
  ): Promise<MaintenanceDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma manutenção',
    description:
      'Não tem volta. É para o registro lançado errado — cada pessoa exclui o que criou; gerente e administrador excluem qualquer um.',
  })
  @ApiNoContentResponse({ description: 'Manutenção excluída.' })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  @ApiForbiddenResponse({
    description: 'O registro é de outra pessoa e quem pediu não é gerente nem administrador.',
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}
