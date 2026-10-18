import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GithubService } from '../../software-projects/service/github.service';
import { SoftwareProjectsService } from '../../software-projects/service/software-projects.service';
import {
  ticketAreaLabel,
  ticketDepartmentLabel,
  ticketProblemTypeLabel,
  type TicketArea,
} from '@template/shared/domain/ticket-catalog.util';
import { type TicketInvite } from '@template/shared/domain/ticket-invite.util';
import {
  parseTicketProtocol,
  formatTicketProtocol,
} from '@template/shared/domain/ticket-protocol.util';
import {
  countByField,
  summarizeTickets,
  type TicketSummary,
} from '@template/shared/domain/ticket-metrics.util';
import { refuseScreenshot } from '@template/shared/domain/screenshot-catalog.util';
import {
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketStatusLabel,
  ticketStatusTone,
} from '@template/shared/domain/ticket-status.util';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type StagedFile,
  type UploadRequest,
  type UploadTicket,
} from '@template/shared/schemas/staged-file.schema';
import {
  type CreateTicketInput,
  type MyTicket,
  type PublicTicket,
  type OpenedTicket,
  type RequesterDefaults,
  type Ticket,
  type TicketAssigneeOption,
  type TicketListQuery,
  type TicketReportQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  assertCanAttendTicket,
  assertCanRead,
  assertIsSuperAdmin,
} from '../../../lib/policy/policy-assert.util';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type BuiltDocument } from '../../../lib/report/document.type';
import { type ReportColumn } from '../../../lib/report/report.type';
import { capReportRows } from '../../../lib/report/report-limit.util';
import { buildReport, formatReportDate, reportSubtitle } from '../../../lib/report/report.util';
import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { STORAGE } from '../../../lib/storage/storage.token';
import { describeTicketChanges, toUpdateHistory } from '../mapper/ticket-histories.mapper';
import {
  toMyTicket,
  toPublicTicket,
  toTicket,
  toTicketInsert,
  toTicketUpdate,
  type TicketRequester,
} from '../mapper/tickets.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TICKET_NOT_FOUND, TicketAccessService } from './ticket-access.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketAssigneesService } from './ticket-assignees.service';
import { verifyTicketAccess, verifyTicketInvite } from './ticket-invite.util';
import { TicketHistoriesService } from './ticket-histories.service';
import {
  type TicketNoticeOutcome,
  TicketWhatsappNotifierService,
} from './ticket-whatsapp-notifier.service';
import { TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';

/** Sem repetir — somar a mesma área participante duas vezes não deve duplicar na resposta. */
function dedupeAreas(areas: readonly TicketArea[]): TicketArea[] {
  return Array.from(new Set(areas));
}

/**
 * As colunas do relatório de chamados, na mesma ordem em que a fila do painel as mostra —
 * quem baixa o arquivo está levando a MESMA lista, não uma versão nova para decorar.
 */
const TICKET_REPORT_COLUMNS: ReportColumn<TicketRow>[] = [
  { header: 'Protocolo', value: (row) => formatTicketProtocol(row.id), isTitle: true },
  { header: 'Quem abriu', value: (row) => row.requesterName },
  { header: 'Área', value: (row) => ticketAreaLabel(row.area) },
  { header: 'Departamento', value: (row) => ticketDepartmentLabel(row.department) },
  { header: 'Tipo de problema', value: (row) => ticketProblemTypeLabel(row.problemType) },
  {
    header: 'Urgência',
    value: (row) => ticketPriorityLabel(row.priority),
    tone: (row) => ticketPriorityTone(row.priority),
  },
  {
    header: 'Estágio',
    value: (row) => ticketStatusLabel(row.status),
    tone: (row) => ticketStatusTone(row.status),
  },
  { header: 'Responsável', value: (row) => row.assignee ?? '—' },
  { header: 'O que foi feito', value: (row) => row.solution ?? '—' },
  { header: 'Aberto em', value: (row) => formatReportDate(row.createdAt) },
  { header: 'Resolvido em', value: (row) => formatReportDate(row.resolvedAt) },
];

const NOT_FOUND = TICKET_NOT_FOUND;

/** A pasta do print dentro do bucket. */
const SCREENSHOT_FOLDER = 'tickets';

export type TicketDashboard = TicketSummary & {
  byProblemType: { key: string; count: number }[];
  byDepartment: { key: string; count: number }[];
  byArea: { key: string; count: number }[];
};

/**
 * O ÚNICO caminho de escrita de chamado. Controller não fala com repository, e o repository
 * não decide nada.
 *
 * Duas fronteiras diferentes convivem aqui, e é de propósito:
 *
 * - `create`, `findByProtocol` e `listMine` são de QUEM PEDE: qualquer pessoa logada abre
 *   chamado e acompanha os seus. A proteção delas é a identidade carimbada (o chamado é de
 *   quem abriu) e o que cada uma devolve (a consulta devolve o chamado podado, e só para quem
 *   abriu ou atende uma área dele).
 * - `list`, `findById`, `dashboard` e `update` são do painel, e começam pela policy.
 *
 * Não existe método de exclusão, em nenhuma das duas: chamado sai da fila por estágio.
 *
 * **E não existe método que mude o estágio.** Isso é do `TicketHistoriesService`: o estágio só
 * muda quando alguém lança um histórico na ordem de serviço. `update` corrige os DADOS do
 * chamado — e deixa na linha do tempo, sozinho, o que foi alterado.
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly repository: TicketsRepository,
    @Inject(STORAGE) private readonly storage: FileStorage,
    private readonly staging: StagedUploadsService,
    private readonly attachments: TicketAttachmentsService,
    private readonly access: TicketAccessService,
    private readonly histories: TicketHistoriesService,
    private readonly historiesRepository: TicketHistoriesRepository,
    @Optional() private readonly githubService?: GithubService,
    @Optional() private readonly softwareProjectsService?: SoftwareProjectsService,
    @Optional() private readonly assignees?: TicketAssigneesService,
    @Optional() private readonly notifier?: TicketWhatsappNotifierService,
    @Optional() @Inject(ENV) private readonly env?: Env,
  ) {}

  /** O link para enviar o print ou um anexo do chamado que vai ser aberto. */
  createUploadTicket(input: UploadRequest): Promise<UploadTicket> {
    return this.attachments.createOpeningUploadTicket(input);
  }

  /** Quem pode ser escolhido como responsável por um chamado desta área (lista pública). */
  async listAssigneeOptions(area: TicketArea): Promise<TicketAssigneeOption[]> {
    return (await this.assignees?.listForArea(area)) ?? [];
  }

  /**
   * O que um convite de chamado diz — o link que o bot manda a quem escreve `/chamado`. A tela
   * pública usa a resposta para abrir o formulário já com o responsável e o telefone.
   *
   * Convite forjado, vencido ou de alguém que deixou de atender: 404, sem dizer qual dos três.
   */
  async readInvite(token: string, nowSeconds: number = Date.now() / 1000): Promise<TicketInvite> {
    const invite = this.env?.BOT_API_TOKEN
      ? verifyTicketInvite(token, this.env.BOT_API_TOKEN, nowSeconds)
      : null;
    const attendant = invite ? await this.assignees?.areasOf(invite.assigneeId) : null;
    if (!invite || !attendant || attendant.areas.length === 0) {
      throw new NotFoundException('Este link não vale mais. Peça outro pelo WhatsApp.');
    }

    return {
      assignee: { id: invite.assigneeId, name: attendant.name },
      areas: attendant.areas,
      phone: invite.phone,
    };
  }

  /**
   * O responsável escolhido, conferido: ele precisa atender a área do chamado. O id vem de
   * fora (uma tela pública, ou o corpo de uma edição) e não é de confiança.
   */
  private async resolveAssignee(
    area: TicketArea,
    /* `unknown` porque o tipo de ENTRADA do contrato não sabe que o campo já foi normalizado. */
    assigneeId: unknown,
  ): Promise<{ id: string; name: string } | null> {
    if (typeof assigneeId !== 'string' || !assigneeId) return null;

    const assignee = await this.assignees?.resolve(area, assigneeId);
    if (!assignee) {
      throw new UnprocessableEntityException(
        'O responsável escolhido não atende esta área. Escolha outro.',
      );
    }

    return assignee;
  }

  /* Quem pediu aviso recebe o "recebi o seu chamado" pelo WhatsApp de quem atende. O aviso
     entra na fila de saída (é só uma gravação no banco, sem esperar o bot) e o desfecho volta
     com o chamado: `queued`, ou por que nem entrou — e aí a tela oferece o link manual. */
  private async announceOpening(row: TicketRow, isSkipped = false): Promise<TicketNoticeOutcome> {
    if (isSkipped) return 'not_wanted';

    /* Nunca derruba a abertura: o chamado já está gravado, e o aviso é um extra. */
    return (await this.notifier?.opened(row).catch(() => 'failed' as const)) ?? 'not_configured';
  }

  /**
   * Trocar o responsável é do super admin. O novo precisa atender a área em que o chamado vai
   * FICAR — a nova, se esta mesma edição o reclassificou. Sem `assigneeId` no corpo, não mexe.
   */
  private async resolveReassignment(
    user: RequestUser,
    currentArea: TicketArea,
    input: UpdateTicketInput,
  ): Promise<{ id: string; name: string } | undefined> {
    if (input.assigneeId === undefined) return undefined;

    assertIsSuperAdmin(user.role, 'o responsável do chamado');

    return (await this.resolveAssignee(input.area ?? currentArea, input.assigneeId)) ?? undefined;
  }

  /**
   * Avisa pelo WhatsApp que o chamado ficou pronto, pelo número do responsável. Devolve o
   * desfecho em vez de lançar: quando não sai (sem vínculo, teto do dia), a tela cai no link
   * manual de sempre.
   */
  async notifyReady(user: RequestUser, id: number): Promise<{ outcome: TicketNoticeOutcome }> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, id);
    this.access.assertCanWrite(reach);

    return { outcome: (await this.notifier?.ready(reach.ticket)) ?? 'not_configured' };
  }

  /** Os avisos de WhatsApp do chamado — quem pode ver o chamado vê se os avisos saíram. */
  async whatsappNotices(user: RequestUser, id: number): Promise<WhatsappNotice[]> {
    assertCanAttendTicket(user.role);
    await this.access.reach(user, id);

    return (await this.notifier?.notices(id)) ?? [];
  }

  /** Reenviar é escrever no chamado: pede a mesma permissão de avisar. */
  async retryWhatsappNotice(
    user: RequestUser,
    id: number,
    noticeId: number,
  ): Promise<WhatsappNotice> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, id);
    this.access.assertCanWrite(reach);

    const notice = await this.notifier?.retry(id, noticeId);
    if (!notice) {
      throw new ConflictException(
        'Este aviso não pode ser reenviado: ele está na fila ou já saiu.',
      );
    }

    return notice;
  }

  async listSystemProjectOptions(): Promise<{ id: number; name: string }[]> {
    return (await this.softwareProjectsService?.listTicketOptions()) ?? [];
  }

  async list(user: RequestUser, query: TicketListQuery): Promise<Paginated<Ticket>> {
    assertCanRead(user.role, 'os chamados');

    const areas = await this.access.accessibleAreas(user);
    const page = await this.repository.list(query, areas);
    const items = await this.withAreasAndScreenshots(page.rows);

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async findById(user: RequestUser, id: number): Promise<Ticket> {
    assertCanRead(user.role, 'os chamados');

    const { ticket, participantAreas } = await this.access.reach(user, id);

    return this.toFullTicket(ticket, participantAreas);
  }

  /**
   * Baixar o relatório: os MESMOS filtros da fila, mas sem página — o arquivo leva tudo que
   * casou, no formato escolhido, até o teto de linhas (`REPORT_MAX_ROWS`). Passou do teto, o
   * subtítulo avisa que há mais.
   */
  async exportList(user: RequestUser, query: TicketReportQuery): Promise<BuiltDocument> {
    assertCanRead(user.role, 'os chamados');

    const areas = await this.access.accessibleAreas(user);
    const { rows, isTruncated } = capReportRows(await this.repository.listAll(query, areas));

    return buildReport({
      format: query.format,
      title: 'Chamados',
      subtitle: reportSubtitle(rows.length, 'chamado', 'chamados', isTruncated),
      fileName: 'chamados',
      columns: TICKET_REPORT_COLUMNS,
      rows,
    });
  }

  /**
   * Os indicadores do painel, sobre TODOS os chamados — da área pedida, ou das áreas que a
   * pessoa enxerga quando nenhuma é pedida.
   *
   * A área pedida é sempre cruzada com as que a pessoa atende, e não substitui a trava: pedir
   * uma área sem cargo devolve indicadores ZERADOS, não os de outra área. Zero, e não erro,
   * porque esta é uma leitura de contexto do menu — um 403 piscando na tela enquanto o
   * contexto se ajusta ao cargo assustaria sem informar nada.
   */
  async dashboard(user: RequestUser, area?: TicketArea): Promise<TicketDashboard> {
    assertCanRead(user.role, 'os chamados');

    const accessible = await this.access.accessibleAreas(user);
    const areas = area ? accessible.filter((mine) => mine === area) : accessible;
    const rows = await this.repository.listForMetrics(areas);
    const measurable = rows.map((row) => ({
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    }));

    return {
      ...summarizeTickets(measurable),
      byProblemType: countByField(rows, (row) => row.problemType),
      byDepartment: countByField(rows, (row) => row.department),
      byArea: countByField(rows, (row) => row.area),
    };
  }

  /** As áreas que esta pessoa atende — alimenta o seletor de contexto no app-shell (#13). */
  async myAreas(user: RequestUser): Promise<TicketArea[]> {
    assertCanRead(user.role, 'os chamados');

    return this.access.accessibleAreas(user);
  }

  /**
   * Abrir chamado. Pela tela, quem abre está LOGADO, e o chamado fica ligado à conta dela no
   * Neon Auth (`options.requester`) — o nome é o da conta, nunca o do corpo. Sem `requester`
   * só entra o bot do WhatsApp quando não reconheceu quem escreve; reconhecendo, ele passa a
   * conta da pessoa como `requester`.
   *
   * O print e os anexos chegam já enviados pelo navegador, na área temporária
   * (`input.screenshot`, `input.attachments`). O print sai de lá ANTES do chamado existir: se a
   * gravação do chamado falhar depois, sobra um arquivo órfão no bucket — o contrário (chamado
   * apontando para um arquivo que não existe) mostraria uma imagem quebrada para o TI, e essa é
   * a falha pior.
   */
  async create(
    input: CreateTicketInput,
    /* Quem abriu pela CONVERSA já recebe a confirmação na própria conversa: mandar também o
       aviso de "chamado aberto" seriam duas mensagens dizendo a mesma coisa. */
    options: { skipOpeningNotice?: boolean; requester?: TicketRequester } = {},
  ): Promise<OpenedTicket> {
    await this.assertSystemProject(input);

    const assignee = await this.resolveAssignee(input.area, input.assigneeId);
    const screenshotKey = await this.storeScreenshot(input.screenshot);
    const row = await this.repository.insert(
      toTicketInsert(input, screenshotKey, assignee, options.requester),
    );

    const openingNotice = await this.announceOpening(row, options.skipOpeningNotice);

    /* Os arquivos entram DEPOIS do chamado existir, porque é a ele que eles pertencem. Um
       arquivo fora das regras derruba a requisição — e o chamado já gravado fica, sem os
       anexos: perder o pedido de socorro por causa de um PDF grande demais seria o pior dos
       dois males. Quem envia vê o protocolo e o motivo, e anexa o resto pelo painel. */
    /* `requester`: é a prova de quem pediu socorro, e ela é dela — o TI vê e baixa, mas não
       apaga (ver `attachment-ownership.util`). */
    /* A linha do tempo começa aqui: a abertura é o primeiro histórico, de quem abriu. */
    await this.histories.recordOpening(row);

    await this.attachments.attach(row.id, input.attachments ?? [], null, 'requester');

    /* Chamado nasce sem área participante — só a original, escolhida por quem abriu. */
    if (row.area === 'sistema' && row.projectId && this.githubService) {
      this.githubService.syncTicketToIssueInBackground(
        row.id,
        row.projectId,
        formatTicketProtocol(row.id),
        `Chamado ${formatTicketProtocol(row.id)} - ${row.problemType}`,
        row.description,
        row.requesterName,
      );
    }

    return { ...(await this.toFullTicket(row, [])), openingNotice };
  }

  /**
   * O chamado de um LINK DE CONSULTA — o link assinado que vai nas mensagens de WhatsApp. Abre
   * direto aquele chamado, com os mesmos campos da consulta por número, para quem pode vê-lo.
   * Link que não confere: 404, igual a um chamado que não existe.
   */
  async findByAccessToken(user: RequestUser, token: string): Promise<PublicTicket> {
    const id = this.env?.BOT_API_TOKEN ? verifyTicketAccess(token, this.env.BOT_API_TOKEN) : null;
    if (!id) throw new NotFoundException(NOT_FOUND);

    return this.findPublicById(user, id);
  }

  /**
   * Consulta pelo NÚMERO do chamado, logada.
   *
   * Aceita o número como a pessoa o digitou (`CH-0007`, `ch 7`, `7`): quem anotou no celular
   * raramente digita o traço, e recusar por causa disso transforma um acerto em erro.
   */
  async findByProtocol(user: RequestUser, protocol: string): Promise<PublicTicket> {
    const id = parseTicketProtocol(protocol);
    if (!id) throw new NotFoundException(NOT_FOUND);

    return this.findPublicById(user, id);
  }

  /**
   * "Meus chamados": os que a pessoa abriu, mais recentes primeiro. Quem nunca abriu nada vê a
   * lista vazia — não é erro.
   */
  async listMine(user: RequestUser): Promise<MyTicket[]> {
    const rows = await this.repository.listByRequester(user.id);

    return rows.map(toMyTicket);
  }

  /* Chamado de Sistema é de um sistema. A exceção é o pedido de USUÁRIO pelo WhatsApp (o
     `/acesso`): quem ainda não tem conta não tem sistema para pedir. */
  private async assertSystemProject(input: CreateTicketInput): Promise<void> {
    if (input.area !== 'sistema') return;
    if (input.problemType === 'access_request' && input.projectId == null) return;

    const projectId = Number(input.projectId);
    const isOption =
      Number.isInteger(projectId) &&
      (await this.softwareProjectsService?.isTicketOption(projectId));
    if (isOption) return;

    throw new UnprocessableEntityException('Selecione um sistema disponível para abrir o chamado.');
  }

  /** Quem já abriu chamado com este telefone — o desempate do bot para reconhecer quem escreve. */
  async phoneOwnersOf(phone: string): Promise<string[]> {
    return this.repository.requesterIdsByPhone(phone);
  }

  /**
   * O que o formulário de abrir chamado já traz: o nome e o e-mail da CONTA (o nome não se
   * muda), e o telefone e o departamento do último chamado da pessoa — que ela confirma ou
   * corrige. A conta do Neon Auth não tem nenhum dos dois; quem nunca abriu chamado digita.
   */
  async requesterDefaults(user: RequestUser): Promise<RequesterDefaults> {
    const last = await this.repository.lastContactOf(user.id);

    return {
      name: user.name,
      email: user.email,
      phone: last?.contactPhone ?? null,
      department: last?.department ?? null,
    };
  }

  /**
   * Quem pode ver um chamado pela consulta: QUEM ABRIU, ou quem atende alguma área dele.
   * Qualquer outra pessoa recebe o mesmo 404 de um chamado que não existe — 403 contaria que
   * aquele número existe e é de outra pessoa.
   */
  private async findPublicById(user: RequestUser, id: number): Promise<PublicTicket> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);
    if (!(await this.canLookUp(user, row))) throw new NotFoundException(NOT_FOUND);

    const [screenshotUrl, attachments] = await Promise.all([
      this.screenshotUrl(row),
      this.attachments.list(row.id),
    ]);
    const histories = await this.histories.listPublic(row.id, attachments);

    /* Fora da linha do tempo ficam só os arquivos do PRÓPRIO chamado. Os que entraram junto
       de um histórico saem dentro dele — e os de um histórico escondido não saem. */
    const ownFiles = attachments.filter((attachment) => attachment.historyId === null);

    return toPublicTicket(row, screenshotUrl, ownFiles, histories);
  }

  private async canLookUp(user: RequestUser, row: TicketWithComputer): Promise<boolean> {
    if (row.requesterId && row.requesterId === user.id) return true;

    const [areas, participants] = await Promise.all([
      this.access.accessibleAreas(user),
      this.repository.listAreasOf(row.id),
    ]);

    return [row.area, ...participants].some((area) => areas.includes(area));
  }

  async update(user: RequestUser, id: number, input: UpdateTicketInput): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, id);
    const current = reach.ticket;
    /* Escrever (qualquer campo) já exige gestor+ — quem só tem o cargo `user` na área só lê. */
    this.access.assertCanWrite(reach);

    /* Reclassificar É mexer em quem atende — por isso pede gestor, não só "ter cargo". Sem
       esta trava, quem só lê a área de Infra poderia empurrar um chamado para Manutenção e
       nunca mais vê-lo responder por ele. */
    if (input.area !== undefined && input.area !== current.area) {
      this.access.assertCanManageArea(reach, 'reclassificar');
    }

    const assignee = await this.resolveReassignment(user, current.area, input);
    const row = await this.repository.update(
      id,
      toTicketUpdate(input, user.email, new Date(), assignee),
    );

    /* O que mudou vai para a linha do tempo, com quem mudou. Salvar sem mudar nada não deixa
       rastro: uma linha do tempo cheia de "alteração" vazia esconde as que importam. */
    const changes = describeTicketChanges(current, row);
    if (changes) {
      await this.historiesRepository.record(
        toUpdateHistory(row, changes, { name: user.name, email: user.email }),
      );
    }

    if (row.area === 'sistema' && row.projectId && !row.githubIssueNumber && this.githubService) {
      this.githubService.syncTicketToIssueInBackground(
        row.id,
        row.projectId,
        formatTicketProtocol(row.id),
        `Chamado ${formatTicketProtocol(row.id)} - ${row.problemType}`,
        row.description,
        row.requesterName,
        user.id,
      );
    }

    return this.toFullTicket(row, reach.participantAreas);
  }

  /**
   * Soma uma área PARTICIPANTE (#13) — ex.: um chamado de Infra que também precisa de
   * Manutenção. A área original não muda.
   */
  async addArea(user: RequestUser, id: number, area: TicketArea): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, id);
    this.access.assertCanManageArea(reach, 'somar uma área a');

    if (area === reach.ticket.area) {
      throw new UnprocessableEntityException(
        `${ticketAreaLabel(area)} já é a área original deste chamado.`,
      );
    }

    await this.repository.addArea({ ticketId: id, area, createdBy: user.email });

    return this.toFullTicket(reach.ticket, dedupeAreas([...reach.participantAreas, area]));
  }

  /** Tira uma área participante — a área original nunca pode ser removida por aqui. */
  async removeArea(user: RequestUser, id: number, area: TicketArea): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, id);
    this.access.assertCanManageArea(reach, 'remover uma área de');

    await this.repository.removeArea(id, area);

    return this.toFullTicket(
      reach.ticket,
      reach.participantAreas.filter((candidate) => candidate !== area),
    );
  }

  /** As áreas participantes de VÁRIOS chamados de uma vez, mais o print — para a fila. */
  private async withAreasAndScreenshots(rows: TicketWithComputer[]): Promise<Ticket[]> {
    const areasByTicket = await this.repository.listAreasFor(rows.map((row) => row.id));

    return Promise.all(rows.map((row) => this.toFullTicket(row, areasByTicket.get(row.id) ?? [])));
  }

  private async toFullTicket(
    row: TicketWithComputer,
    participantAreas: readonly TicketArea[],
  ): Promise<Ticket> {
    return toTicket(row, await this.screenshotUrl(row), participantAreas);
  }

  /** Link assinado e temporário. Sem print, nulo — a tela usa isso para não mostrar nada. */
  private async screenshotUrl(row: TicketRow): Promise<string | null> {
    if (!row.screenshotKey) return null;

    return this.storage.downloadUrl(row.screenshotKey, DOWNLOAD_URL_TTL_SECONDS, null);
  }

  /**
   * Tira o print da área temporária, depois de conferir o arquivo que o storage MEDIU. O que não
   * serve é recusado com o motivo e sai da área temporária.
   */
  private async storeScreenshot(screenshot?: StagedFile): Promise<string | null> {
    if (!screenshot) return null;

    const measured = await this.staging.inspect(screenshot);
    const refusal = refuseScreenshot(measured);
    if (refusal) {
      await this.staging.discard([screenshot.storageKey]);
      throw new UnprocessableEntityException(refusal.message);
    }

    return this.staging.promote(screenshot, SCREENSHOT_FOLDER);
  }
}
