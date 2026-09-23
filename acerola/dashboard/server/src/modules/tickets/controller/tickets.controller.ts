import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateTicketDto,
  PublicTicketDto,
  TicketDto,
  TicketListQueryDto,
  TicketListResponseDto,
  UpdateTicketDto,
} from '../dto/ticket.dto';
import { type TicketDashboard, TicketsService, type UploadedScreenshot } from '../service/tickets.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Duas rotas são `@Public()` — abrir chamado e consultar pelo protocolo. É assim de
 * propósito: quem está sem impressora não tem conta no painel, e exigir login para pedir
 * socorro significaria não receber o pedido. Toda rota nasce protegida; estas duas abrem a
 * exceção explicitamente, numa linha que aparece na revisão.
 *
 * Não há `@Delete` nenhum: chamado não se apaga. O que sai da fila sai por situação.
 *
 * Swagger é obrigatório (CONTRIBUTING §8): todo endpoint tem `@ApiOperation` e o tipo de
 * resposta. A documentação fica em http://localhost:3336/docs.
 */
@ApiTags('Chamados')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  @Public()
  @UseInterceptors(FileInterceptor('screenshot'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Abre um chamado (público)',
    description:
      'Não exige login. O print do erro viaja como arquivo no campo `screenshot`, na mesma requisição — não há endereço separado de envio de arquivo. A situação e o responsável não são aceitos no corpo: todo chamado nasce aberto e sem responsável.',
  })
  @ApiBody({ type: CreateTicketDto })
  @ApiCreatedResponse({ type: TicketDto })
  @ApiUnprocessableEntityResponse({
    description: 'Algum campo está fora do contrato, ou o print não é uma imagem aceita.',
  })
  async create(
    @Body() body: CreateTicketDto,
    @UploadedFile() screenshot?: UploadedScreenshot,
  ): Promise<TicketDto> {
    return this.service.create(body, screenshot);
  }

  @Get('protocol/:protocol')
  @Public()
  @ApiOperation({
    summary: 'Consulta um chamado pelo protocolo (público)',
    description:
      'Devolve UM chamado, com menos campos que o painel: telefone, responsável e solução ficam de fora. Aceita `CH-0007`, `ch 7` ou `7`.',
  })
  @ApiOkResponse({ type: PublicTicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async findByProtocol(@Param('protocol') protocol: string): Promise<PublicTicketDto> {
    return this.service.findByProtocol(protocol);
  }

  /* Vem ANTES de `:id`: declarada depois, o Nest leria "dashboard" como se fosse um número. */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Indicadores dos chamados',
    description:
      'Calculados sobre todos os chamados, não só sobre a página aberta: tempo médio de resolução, contagem por situação, por tipo de problema e por departamento.',
  })
  @ApiOkResponse({ description: 'Contagens e o tempo médio de resolução em horas.' })
  async dashboard(@CurrentUser() user: RequestUser): Promise<TicketDashboard> {
    return this.service.dashboard(user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista chamados',
    description:
      'Do mais novo para o mais antigo. A busca procura no nome de quem abriu, na descrição, no responsável e na solução.',
  })
  @ApiOkResponse({ type: TicketListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: TicketListQueryDto,
  ): Promise<TicketListResponseDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre um chamado no painel' })
  @ApiOkResponse({ type: TicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketDto> {
    return this.service.findById(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atende um chamado',
    description:
      'Muda a situação, a urgência, quem assumiu e o que foi feito. As datas de início e de resolução são carimbadas pelo servidor a partir da mudança de situação. Nada que identifique quem abriu pode ser alterado.',
  })
  @ApiOkResponse({ type: TicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  @ApiForbiddenResponse({ description: 'O perfil de quem pediu não permite atender chamados.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTicketDto,
  ): Promise<TicketDto> {
    return this.service.update(user, id, body);
  }
}
