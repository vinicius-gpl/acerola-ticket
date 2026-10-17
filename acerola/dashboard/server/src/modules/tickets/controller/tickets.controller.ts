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
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { TICKET_UPLOAD_MAX_BYTES, uploadLimit } from '../../../lib/http/upload-limit.util';
import { UploadTooLargeInterceptor } from '../../../lib/http/upload-too-large.interceptor';
import {
  ApiBody,
  ApiConflictResponse,
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
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  AddTicketAreaDto,
  CreateTicketDto,
  MyTicketDto,
  OpenedTicketDto,
  PublicTicketDto,
  RequesterDefaultsDto,
  TicketAssigneeOptionDto,
  TicketAssigneeOptionsQueryDto,
  TicketDashboardQueryDto,
  TicketDto,
  TicketInviteDto,
  TicketListQueryDto,
  TicketListResponseDto,
  TicketNoticeDto,
  TicketReportQueryDto,
  UpdateTicketDto,
  WhatsappNoticeDto,
} from '../dto/ticket.dto';
import { type UploadedAttachment } from '../service/ticket-attachments.service';
import {
  type TicketDashboard,
  TicketsService,
  type UploadedScreenshot,
} from '../service/tickets.service';
import { AnyModule } from '../../../lib/auth/module-context.decorator';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Nenhuma rota é pública: abrir chamado e consultar exigem login no Neon Auth, e o chamado
 * fica ligado a quem abriu. Qualquer pessoa com conta abre — mesmo sem cargo em área
 * nenhuma —, e quem decide até onde cada um vai é o service.
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
@AnyModule()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  @UseInterceptors(
    UploadTooLargeInterceptor,
    FileFieldsInterceptor(
      [
        { name: 'screenshot', maxCount: 1 },
        { name: 'attachments', maxCount: MAX_ATTACHMENTS_PER_REQUEST },
      ],
      uploadLimit(TICKET_UPLOAD_MAX_BYTES),
    ),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Abre um chamado',
    description:
      'Qualquer pessoa logada abre. O chamado fica ligado a ela pelo id do Neon Auth, e o nome é o da conta — o `requesterName` do corpo é ignorado. Os arquivos viajam na mesma requisição: o print do erro no campo `screenshot` e os demais anexos no campo `attachments` — PDF, Word, Excel, PNG/JPG e MP4, cada formato com o teto dele. A situação e o responsável não são aceitos no corpo: todo chamado nasce aberto e sem responsável.',
  })
  @ApiBody({ type: CreateTicketDto })
  @ApiCreatedResponse({ type: OpenedTicketDto })
  @ApiUnprocessableEntityResponse({
    description: 'Algum campo está fora do contrato, ou o print não é uma imagem aceita.',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateTicketDto,
    @UploadedFiles() files?: TicketUploads,
  ): Promise<OpenedTicketDto> {
    return this.service.create(body, files?.screenshot?.[0], files?.attachments ?? [], {
      requester: { id: user.id, email: user.email, name: user.name },
    });
  }

  /* Vem ANTES de `:id`, pelo mesmo motivo de `dashboard` e `export`. */
  @Get('mine')
  @ApiOperation({
    summary: 'Meus chamados',
    description:
      'Os chamados que a pessoa logada abriu, mais recentes primeiro (até 50). O detalhe de cada um sai pela consulta do número.',
  })
  @ApiOkResponse({ type: [MyTicketDto] })
  async listMine(@CurrentUser() user: RequestUser): Promise<MyTicketDto[]> {
    return this.service.listMine(user);
  }

  @Get('requester-defaults')
  @ApiOperation({
    summary: 'O que o formulário de abrir chamado já traz preenchido',
    description:
      'Nome e e-mail da conta da pessoa logada (o nome não se muda), e telefone e departamento do último chamado que ela abriu. Quem nunca abriu chamado recebe telefone e departamento nulos.',
  })
  @ApiOkResponse({ type: RequesterDefaultsDto })
  async requesterDefaults(@CurrentUser() user: RequestUser): Promise<RequesterDefaultsDto> {
    return this.service.requesterDefaults(user);
  }

  @Get('system-project-options')
  @ApiOperation({ summary: 'Lista os sistemas disponíveis para abrir chamado' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
    },
  })
  async listSystemProjectOptions(): Promise<{ id: number; name: string }[]> {
    return this.service.listSystemProjectOptions();
  }

  @Get('assignee-options')
  @ApiOperation({
    summary: 'Lista quem pode ser o responsável por um chamado de uma área',
    description:
      'Os admins daquela área, mais os super admins. Só o nome e o id: é o que o formulário de abrir chamado precisa para a pessoa escolher com quem quer falar.',
  })
  @ApiOkResponse({ type: [TicketAssigneeOptionDto] })
  async listAssigneeOptions(
    @Query() query: TicketAssigneeOptionsQueryDto,
  ): Promise<TicketAssigneeOptionDto[]> {
    return this.service.listAssigneeOptions(query.area);
  }

  @Get('access/:token')
  @ApiOperation({
    summary: 'Consulta um chamado pelo link assinado',
    description:
      'O link de consulta é o que vai nas mensagens de WhatsApp de um chamado. Abre direto aquele chamado, com os mesmos campos da consulta por número, para quem abriu ou atende uma área dele. Link alterado: 404.',
  })
  @ApiOkResponse({ type: PublicTicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async findByAccessToken(
    @CurrentUser() user: RequestUser,
    @Param('token') token: string,
  ): Promise<PublicTicketDto> {
    return this.service.findByAccessToken(user, token);
  }

  @Get('invites/:token')
  @ApiOperation({
    summary: 'Lê um convite de chamado',
    description:
      'O convite é o link assinado que o bot de WhatsApp manda a quem escreve `/chamado`. Devolve o responsável, as áreas que ele atende e o telefone de quem escreveu, para o formulário abrir preenchido. Link forjado ou vencido: 404.',
  })
  @ApiOkResponse({ type: TicketInviteDto })
  @ApiNotFoundResponse({ description: 'O link não vale mais.' })
  async readInvite(@Param('token') token: string): Promise<TicketInviteDto> {
    return this.service.readInvite(token);
  }

  @Get('protocol/:protocol')
  @ApiOperation({
    summary: 'Consulta um chamado pelo número',
    description:
      'Devolve UM chamado, com menos campos que o painel: telefone e responsável ficam de fora, e da linha do tempo só saem os históricos marcados como visíveis para quem abriu. Só responde para quem abriu ou atende uma área dele — para os outros é 404. Aceita `CH-0007`, `ch 7` ou `7`.',
  })
  @ApiOkResponse({ type: PublicTicketDto })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async findByProtocol(
    @CurrentUser() user: RequestUser,
    @Param('protocol') protocol: string,
  ): Promise<PublicTicketDto> {
    return this.service.findByProtocol(user, protocol);
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

  @Post(':id/whatsapp-notice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Avisa pelo WhatsApp que o chamado ficou pronto',
    description:
      'A mensagem sai pelo número vinculado do RESPONSÁVEL pelo chamado. Devolve o desfecho: `queued` quando entrou na fila de saída (sai em seguida, com novas tentativas se o WhatsApp estiver fora); qualquer outro valor diz por que nem entrou (sem responsável, sem número vinculado, pessoa não pediu aviso), e a tela oferece o link manual.',
  })
  @ApiOkResponse({ type: TicketNoticeDto })
  async notifyReady(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketNoticeDto> {
    return this.service.notifyReady(user, id);
  }

  @Get(':id/whatsapp-notices')
  @ApiOperation({
    summary: 'Lista os avisos de WhatsApp de um chamado',
    description:
      'Os avisos que o chamado gerou ("chamado recebido", "chamado pronto"), do mais novo para o mais antigo: se saíram, se estão na fila ou se pararam — e por quê. Não traz o texto nem o telefone.',
  })
  @ApiOkResponse({ type: [WhatsappNoticeDto] })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async notices(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WhatsappNoticeDto[]> {
    return this.service.whatsappNotices(user, id);
  }

  @Post(':id/whatsapp-notices/:noticeId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenvia um aviso de WhatsApp que não saiu',
    description:
      'Põe de volta na fila um aviso que parou (`failed` ou `discarded`), com mais 1 dia de tentativas. O que está na fila ou já saiu não é reenviado.',
  })
  @ApiOkResponse({ type: WhatsappNoticeDto })
  @ApiNotFoundResponse({ description: 'Chamado ou aviso não encontrado.' })
  @ApiConflictResponse({ description: 'O aviso está na fila ou já saiu.' })
  async retryNotice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<WhatsappNoticeDto> {
    return this.service.retryWhatsappNotice(user, id, noticeId);
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
