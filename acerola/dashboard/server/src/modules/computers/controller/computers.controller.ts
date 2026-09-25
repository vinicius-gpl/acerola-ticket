import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  ComputerAlertDto,
  ComputerDto,
  ComputerListQueryDto,
  ComputerListResponseDto,
  ComputerSampleDto,
  CreateComputerDto,
  CreatedComputerDto,
  DisposeComputerDto,
  UpdateComputerDto,
} from '../dto/computer.dto';
import { ComputersService } from '../service/computers.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão — o inventário é do TI. Quem entra sem identidade é o AGENTE,
 * e ele não passa por aqui: fala pelo WebSocket em `/agent`, provando quem é com o token da
 * máquina (ver `AgentGateway`).
 *
 * Não há `@Delete` nenhum: computador que saiu de uso é arquivado, e o histórico dele é o que
 * sustenta a decisão de trocar equipamento.
 */
@ApiTags('Computadores')
@Controller('computers')
export class ComputersController {
  constructor(private readonly service: ComputersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os computadores',
    description:
      'Da pior saúde para a melhor — quem abre o inventário está procurando problema. As máquinas arquivadas ficam de fora, a não ser que `includeArchived` peça por elas.',
  })
  @ApiOkResponse({ type: ComputerListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ComputerListQueryDto,
  ): Promise<ComputerListResponseDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre a ficha de um computador' })
  @ApiOkResponse({ type: ComputerDto })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComputerDto> {
    return this.service.findById(user, id);
  }

  @Get(':id/samples')
  @ApiOperation({
    summary: 'O uso da máquina nas últimas horas',
    description:
      'Uma linha por leitura do agente, da mais antiga para a mais nova — que é como um gráfico de linha lê.',
  })
  @ApiOkResponse({ type: [ComputerSampleDto] })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  async samples(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComputerSampleDto[]> {
    return this.service.samples(user, id);
  }

  @Get(':id/alerts')
  @ApiOperation({
    summary: 'Os alertas da máquina',
    description:
      'Cada alerta é um período: abre quando a medida passa do limite e fecha quando ela volta. Alerta sem data de recuperação é um problema acontecendo agora.',
  })
  @ApiOkResponse({
    type: [ComputerAlertDto],
    description: 'Os episódios de alerta, do mais recente para o mais antigo.',
  })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  async alerts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComputerAlertDto[]> {
    return this.service.alerts(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um computador e gera o token do agente',
    description:
      'O cadastro vem ANTES da instalação do agente: é ele que gera o token. A resposta traz o token em texto puro, e é a ÚNICA vez que ele existe legível — o banco guarda só o hash. Perdeu, gera outro.',
  })
  @ApiCreatedResponse({ type: CreatedComputerDto })
  @ApiUnprocessableEntityResponse({ description: 'Algum campo está fora do contrato.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateComputerDto,
  ): Promise<CreatedComputerDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Altera a identificação de um computador',
    description:
      'Apelido, responsável, departamento, arquivamento e bloqueio. Nada de hardware entra aqui: aquilo é medido pelo agente, não digitado — corrigir à mão faria a ficha discordar da máquina na próxima leitura.',
  })
  @ApiOkResponse({ type: ComputerDto })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  @ApiForbiddenResponse({ description: 'O perfil de quem pediu não permite alterar o cadastro.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateComputerDto,
  ): Promise<ComputerDto> {
    return this.service.update(user, id, body);
  }

  @Post(':id/disposal')
  @ApiOperation({
    summary: 'Descarta um computador',
    description:
      'A máquina sai das listas do dia a dia, com tipo (defeito ou lixo), motivo e a data de hoje. Nada é apagado: manutenções, alertas e peças continuam ligados a ela. Descartar de novo troca o tipo e preserva a data original.',
  })
  @ApiCreatedResponse({ type: ComputerDto })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Falta o tipo ou o motivo do descarte.' })
  async dispose(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DisposeComputerDto,
  ): Promise<ComputerDto> {
    return this.service.dispose(user, id, body);
  }

  @Delete(':id/disposal')
  @ApiOperation({
    summary: 'Devolve um computador descartado ao inventário',
    description: 'Limpa o descarte inteiro — tipo, motivo e data — e a máquina volta às listas.',
  })
  @ApiOkResponse({ type: ComputerDto })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  async restore(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ComputerDto> {
    return this.service.restore(user, id);
  }

  @Post(':id/token')
  @ApiOperation({
    summary: 'Gera um token novo para a máquina',
    description:
      'Invalida o anterior. É o caminho para token perdido e para token vazado: trocar aqui derruba o agente antigo na próxima conexão, sem precisar ir até a máquina.',
  })
  @ApiCreatedResponse({ type: CreatedComputerDto })
  @ApiNotFoundResponse({ description: 'Computador não encontrado.' })
  async regenerateToken(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreatedComputerDto> {
    return this.service.regenerateToken(user, id);
  }
}
