import {
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
  type CreateTicketInput,
  type PublicTicket,
  type Ticket,
  type TicketListQuery,
  type TicketReportQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type BuiltDocument } from '../../../lib/report/document.type';
import { type ReportColumn } from '../../../lib/report/report.type';
import { buildReport, formatReportDate, reportSubtitle } from '../../../lib/report/report.util';
import { StorageService } from '../../../lib/storage/storage.service';
import { describeTicketChanges, toUpdateHistory } from '../mapper/ticket-histories.mapper';
import { toPublicTicket, toTicket, toTicketInsert, toTicketUpdate } from '../mapper/tickets.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TICKET_NOT_FOUND, TicketAccessService } from './ticket-access.service';
import { TicketAttachmentsService, type UploadedAttachment } from './ticket-attachments.service';
import { TicketHistoriesService } from './ticket-histories.service';
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

/**
 * O arquivo como o multer o entrega. Declarado aqui em vez de instalar `@types/multer`: são
 * quatro campos, e uma dependência a mais para tipar quatro campos não se paga.
 */
export type UploadedScreenshot = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

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
 * - `create` e `findByProtocol` são de quem NÃO tem login. Não chamam policy porque não há
 *   identidade a consultar — a proteção delas é o que cada uma devolve (`findByProtocol`
 *   devolve o chamado podado) e o que cada uma aceita.
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
    private readonly storage: StorageService,
    private readonly attachments: TicketAttachmentsService,
    private readonly access: TicketAccessService,
    private readonly histories: TicketHistoriesService,
    private readonly historiesRepository: TicketHistoriesRepository,
    @Optional() private readonly githubService?: GithubService,
    @Optional() private readonly softwareProjectsService?: SoftwareProjectsService,
  ) {}

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
   * casou, no formato escolhido.
   */
  async exportList(user: RequestUser, query: TicketReportQuery): Promise<BuiltDocument> {
    assertCanRead(user.role, 'os chamados');

    const areas = await this.access.accessibleAreas(user);
    const rows = await this.repository.listAll(query, areas);

    return buildReport({
      format: query.format,
      title: 'Chamados',
      subtitle: reportSubtitle(rows.length, 'chamado', 'chamados'),
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
   * Abrir chamado — PÚBLICO. Não há identidade: quem pediu é o que a pessoa digitou.
   *
   * O print é guardado ANTES do chamado existir. Se a gravação do chamado falhar depois,
   * sobra um arquivo órfão no bucket — o contrário (chamado apontando para um arquivo que
   * não subiu) mostraria uma imagem quebrada para o TI, e essa é a falha pior.
   */
  async create(
    input: CreateTicketInput,
    screenshot?: UploadedScreenshot,
    attachments: readonly UploadedAttachment[] = [],
  ): Promise<Ticket> {
    if (input.area === 'sistema') {
      const projectId = Number(input.projectId);
      if (
        !Number.isInteger(projectId) ||
        !(await this.softwareProjectsService?.isTicketOption(projectId))
      ) {
        throw new UnprocessableEntityException(
          'Selecione um sistema disponível para abrir o chamado.',
        );
      }
    }

    const screenshotKey = await this.storeScreenshot(screenshot);
    const row = await this.repository.insert(toTicketInsert(input, screenshotKey));

    /* Os arquivos entram DEPOIS do chamado existir, porque é a ele que eles pertencem. Um
       arquivo fora das regras derruba a requisição — e o chamado já gravado fica, sem os
       anexos: perder o pedido de socorro por causa de um PDF grande demais seria o pior dos
       dois males. Quem envia vê o protocolo e o motivo, e anexa o resto pelo painel. */
    /* `requester`: é a prova de quem pediu socorro, e ela é dela — o TI vê e baixa, mas não
       apaga (ver `attachment-ownership.util`). */
    /* A linha do tempo começa aqui: a abertura é o primeiro histórico, de quem abriu. */
    await this.histories.recordOpening(row);

    await this.attachments.attach(row.id, attachments, null, 'requester');

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

    return this.toFullTicket(row, []);
  }

  /**
   * Consulta por protocolo — PÚBLICA, e por isso devolve o chamado podado.
   *
   * Aceita o protocolo como a pessoa o digitou (`CH-0007`, `ch 7`, `7`): quem anotou no
   * celular raramente digita o traço, e recusar por causa disso transforma um acerto em erro.
   */
  async findByProtocol(protocol: string): Promise<PublicTicket> {
    const id = parseTicketProtocol(protocol);
    if (!id) throw new NotFoundException(NOT_FOUND);

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

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

    const row = await this.repository.update(id, toTicketUpdate(input, user.email));

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

    return this.storage.createDownloadUrl(row.screenshotKey);
  }

  private async storeScreenshot(screenshot?: UploadedScreenshot): Promise<string | null> {
    if (!screenshot) return null;

    const refusal = refuseScreenshot({
      contentType: screenshot.mimetype,
      sizeBytes: screenshot.size,
    });
    if (refusal) throw new UnprocessableEntityException(refusal.message);

    const stored = await this.storage.upload({
      fileName: screenshot.originalname,
      contentType: screenshot.mimetype,
      content: screenshot.buffer,
      folder: SCREENSHOT_FOLDER,
    });

    return stored.key;
  }
}
