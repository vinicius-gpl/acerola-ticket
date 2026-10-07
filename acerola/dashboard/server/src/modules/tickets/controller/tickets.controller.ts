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
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type Response } from 'express';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  AddTicketAreaDto,
  CreateTicketDto,
  PublicTicketDto,
  TicketDashboardQueryDto,
  TicketDto,
  TicketListQueryDto,
  TicketListResponseDto,
  TicketReportQueryDto,
  UpdateTicketDto,
} from '../dto/ticket.dto';
import { type UploadedAttachment } from '../service/ticket-attachments.service';
import {
  type TicketDashboard,
  TicketsService,
  type UploadedScreenshot,
} from '../service/tickets.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Duas rotas são `@Public()` — abrir chamado e consultar pelo protocolo. É assim de
 * propósito: quem está sem impressora não tem conta no painel, e exigir login para pedir
 * socorro significaria não receber o pedido. Toda rota nasce protegida; estas duas abrem a
 * exceção explicitamente, numa linha que aparece na revisão.
 *
 * Não há `@Delete` de chamado: ele não se apaga. O que sai da fila sai por estágio, e o
 * estágio só muda por um histórico (ver `TicketHistoriesController`).
 *
 * Swagger é obrigatório (CONTRIBUTING §8): todo endpoint tem `@ApiOperation` e o tipo de
 * resposta. A documentação fica em http://localhost:3005/docs.
 */
/**
 * O teto de arquivos numa requisição. O limite de verdade é por formato, e quem o aplica é o
 * domínio — este número só impede que um envio de mil arquivos seja lido antes disso.
 */
const MAX_ATTACHMENTS_PER_REQUEST = 25;

/** Os arquivos como o interceptor de vários campos os entrega. */
type TicketUploads = {
  screenshot?: UploadedScreenshot[];
  attachments?: UploadedAttachment[];
};

@ApiTags('Chamados')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  @Public()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'screenshot', maxCount: 1 },
      { name: 'attachments', maxCount: MAX_ATTACHMENTS_PER_REQUEST },
    ]),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Abre um chamado (público)',
    description:
      'Não exige login. Os arquivos viajam na mesma requisição: o print do erro no campo `screenshot` e os demais anexos no campo `attachments` — PDF, Word, Excel, PNG/JPG e MP4, cada formato com o teto dele. A situação e o responsável não são aceitos no corpo: todo chamado nasce aberto e sem responsável.',
  })
  @ApiBody({ type: CreateTicketDto })
  @ApiCreatedResponse({ type: TicketDto })
  @ApiUnprocessableEntityResponse({
    description: 'Algum campo está fora do contrato, ou o print não é uma imagem aceita.',
  })
  async create(
    @Body() body: CreateTicketDto,
    @UploadedFiles() files?: TicketUploads,
  ): Promise<TicketDto> {
    return this.service.create(body, files?.screenshot?.[0], files?.attachments ?? []);
  }

  @Get('protocol/:protocol')
  @Public()
  @ApiOperation({
    summary: 'Consulta um chamado pelo protocolo (público)',
    description:
      'Devolve UM chamado, com menos campos que o painel: telefone e responsável ficam de fora, e da linha do tempo só saem os históricos marcados como visíveis para quem abriu. Aceita `CH-0007`, `ch 7` ou `7`.',
  })
  @ApiOkResponse({ type: PublicTicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async findByProtocol(@Param('protocol') protocol: string): Promise<PublicTicketDto> {
    return this.service.findByProtocol(protocol);
  }

  /* Vem ANTES de `:id`, pelo mesmo motivo de `dashboard` e `export`. */
  @Get('areas/mine')
  @ApiOperation({
    summary: 'As áreas que esta pessoa atende',
    description:
      'Infra, Sistema e/ou Manutenção — só as que a pessoa tem cargo. Alimenta o seletor de contexto do menu (#13). Administrador enxerga as três sempre.',
  })
  @ApiOkResponse({ description: 'Lista de áreas, de zero a três.' })
  async myAreas(@CurrentUser() user: RequestUser): Promise<TicketArea[]> {
    return this.service.myAreas(user);
  }

  /* Vem ANTES de `:id`: declarada depois, o Nest leria "dashboard" como se fosse um número. */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Indicadores dos chamados',
    description:
      'Calculados sobre todos os chamados, não só sobre a página aberta: tempo médio de resolução, contagem por situação, por tipo de problema e por departamento. Com `area`, são os indicadores DAQUELA área — é o contexto do painel (#13); sem ela, de todas as que a pessoa atende.',
  })
  @ApiOkResponse({ description: 'Contagens e o tempo médio de resolução em horas.' })
  async dashboard(
    @CurrentUser() user: RequestUser,
    @Query() query: TicketDashboardQueryDto,
  ): Promise<TicketDashboard> {
    return this.service.dashboard(user, query.area);
  }

  /* Vem ANTES de `:id`, pelo mesmo motivo de `dashboard`. */
  @Get('export')
  @ApiOperation({
    summary: 'Baixa o relatório dos chamados',
    description:
      'Os MESMOS filtros da fila, sem página — o arquivo leva tudo que casou, no formato escolhido (Excel, Word ou PDF).',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
  )
  @ApiOkResponse({ description: 'O arquivo do relatório, pronto para baixar.' })
  async exportReport(
    @CurrentUser() user: RequestUser,
    @Query() query: TicketReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const report = await this.service.exportList(user, query);

    res.set({
      'Content-Type': report.contentType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
    });

    return new StreamableFile(report.buffer);
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
    summary: 'Corrige os dados de um chamado',
    description:
      'Muda a urgência, a área, o tipo de problema, a máquina e o responsável — e registra a alteração na linha do tempo. O ESTÁGIO não muda por aqui: ele só muda lançando um histórico (`POST /tickets/:id/histories`). Nada que identifique quem abriu pode ser alterado.',
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

  @Post(':id/areas')
  @ApiOperation({
    summary: 'Soma uma área participante ao chamado (#13)',
    description:
      'Ex.: um chamado de Infra que também precisa de Manutenção. A área original não muda. Só quem gerencia alguma área do chamado pode somar outra.',
  })
  @ApiOkResponse({ type: TicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  @ApiForbiddenResponse({ description: 'Só gestor de alguma área do chamado pode somar outra.' })
  async addArea(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddTicketAreaDto,
  ): Promise<TicketDto> {
    return this.service.addArea(user, id, body.area);
  }

  @Delete(':id/areas/:area')
  @ApiOperation({
    summary: 'Tira uma área participante do chamado (#13)',
    description: 'A área original nunca pode ser removida por aqui — só reclassificada (PATCH).',
  })
  @ApiOkResponse({ type: TicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  @ApiForbiddenResponse({ description: 'Só gestor de alguma área do chamado pode remover outra.' })
  async removeArea(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('area') area: TicketArea,
  ): Promise<TicketDto> {
    return this.service.removeArea(user, id, area);
  }
}
