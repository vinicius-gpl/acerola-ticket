import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  TICKET_AREAS,
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
import { type UserRole } from '@template/shared/schemas/user.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { canManageAnyRecord, isAdmin } from '../../../lib/policy/access.policy';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type BuiltReport, type ReportColumn } from '../../../lib/report/report.types';
import { buildReport, formatReportDate, reportSubtitle } from '../../../lib/report/report.util';
import { StorageService } from '../../../lib/storage/storage.service';
import { toPublicTicket, toTicket, toTicketInsert, toTicketUpdate } from '../mapper/tickets.mapper';
import { TicketAttachmentsService, type UploadedAttachment } from './ticket-attachments.service';
import {
  TicketsRepository,
  type TicketWithComputer,
} from '../repository/tickets.repository';

/** O cargo de quem pede, área por área. Área ausente é ausência de cargo — não "cargo mínimo". */
type AreaAccess = Partial<Record<TicketArea, UserRole>>;

/** As áreas em que a pessoa tem ALGUM cargo — é o que ela enxerga (#13). */
function accessibleAreas(access: AreaAccess): TicketArea[] {
  return TICKET_AREAS.filter((area) => access[area] !== undefined);
}

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
    header: 'Situação',
    value: (row) => ticketStatusLabel(row.status),
    tone: (row) => ticketStatusTone(row.status),
  },
  { header: 'Responsável', value: (row) => row.assignee ?? '—' },
  { header: 'O que foi feito', value: (row) => row.solution ?? '—' },
  { header: 'Aberto em', value: (row) => formatReportDate(row.createdAt) },
  { header: 'Resolvido em', value: (row) => formatReportDate(row.resolvedAt) },
];

const NOT_FOUND = 'Chamado não encontrado. Confira o número do protocolo.';

/** A pasta do print dentro do bucket. */
const SCREENSHOT_FOLDER = 'chamados';

/**
 * O print serve para o TI ver a tela de erro. Formato fora desta lista é recusado: aceitar
 * qualquer arquivo transformaria o formulário público num depósito de arquivo qualquer.
 */
const ALLOWED_SCREENSHOT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

/** 8 MB cobre print de tela em qualquer monitor; acima disso é arquivo que não é print. */
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

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
 * Não existe método de exclusão, em nenhuma das duas: chamado sai da fila por situação.
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly repository: TicketsRepository,
    private readonly storage: StorageService,
    private readonly attachments: TicketAttachmentsService,
  ) {}

  async list(user: RequestUser, query: TicketListQuery): Promise<Paginated<Ticket>> {
    assertCanRead(user.role, 'os chamados');

    const areas = accessibleAreas(await this.resolveAreaAccess(user));
    const page = await this.repository.list(query, areas);
    const items = await this.withAreasAndScreenshots(page.rows);

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async findById(user: RequestUser, id: number): Promise<Ticket> {
    assertCanRead(user.role, 'os chamados');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    this.assertCanSeeTicket(await this.resolveAreaAccess(user), row.area, participantAreas);

    return this.toFullTicket(row, participantAreas);
  }

  /**
   * Baixar o relatório: os MESMOS filtros da fila, mas sem página — o arquivo leva tudo que
   * casou, no formato escolhido.
   */
  async exportList(user: RequestUser, query: TicketReportQuery): Promise<BuiltReport> {
    assertCanRead(user.role, 'os chamados');

    const areas = accessibleAreas(await this.resolveAreaAccess(user));
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

  /** Os indicadores do painel, sobre TODOS os chamados das áreas que a pessoa enxerga. */
  async dashboard(user: RequestUser): Promise<TicketDashboard> {
    assertCanRead(user.role, 'os chamados');

    const areas = accessibleAreas(await this.resolveAreaAccess(user));
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

    return accessibleAreas(await this.resolveAreaAccess(user));
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
    const screenshotKey = await this.storeScreenshot(screenshot);
    const row = await this.repository.insert(toTicketInsert(input, screenshotKey));

    /* Os arquivos entram DEPOIS do chamado existir, porque é a ele que eles pertencem. Um
       arquivo fora das regras derruba a requisição — e o chamado já gravado fica, sem os
       anexos: perder o pedido de socorro por causa de um PDF grande demais seria o pior dos
       dois males. Quem envia vê o protocolo e o motivo, e anexa o resto pelo painel. */
    /* `requester`: é a prova de quem pediu socorro, e ela é dela — o TI vê e baixa, mas não
       apaga (ver `attachment-ownership.util`). */
    await this.attachments.attach(row.id, attachments, null, 'requester');

    /* Chamado nasce sem área participante — só a original, escolhida por quem abriu. */
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

    return toPublicTicket(row, screenshotUrl, attachments);
  }

  async update(user: RequestUser, id: number, input: UpdateTicketInput): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    const access = await this.resolveAreaAccess(user);
    this.assertCanSeeTicket(access, current.area, participantAreas);

    /* Reclassificar É mexer em quem atende — por isso pede gestor, não só "ter cargo". Sem
       esta trava, quem só lê a área de Infra poderia empurrar um chamado para Manutenção e
       nunca mais vê-lo responder por ele. */
    if (input.area !== undefined && input.area !== current.area) {
      this.assertCanManageTicketArea(access, current.area, participantAreas, 'reclassificar');
    }

    const row = await this.repository.update(id, toTicketUpdate(input, user.email, current));

    return this.toFullTicket(row, participantAreas);
  }

  /**
   * Soma uma área PARTICIPANTE (#13) — ex.: um chamado de Infra que também precisa de
   * Manutenção. A área original não muda.
   */
  async addArea(user: RequestUser, id: number, area: TicketArea): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    const access = await this.resolveAreaAccess(user);
    this.assertCanManageTicketArea(access, current.area, participantAreas, 'somar uma área a');

    if (area === current.area) {
      throw new UnprocessableEntityException(
        `${ticketAreaLabel(area)} já é a área original deste chamado.`,
      );
    }

    await this.repository.addArea({ ticketId: id, area, createdBy: user.email });

    return this.toFullTicket(current, dedupeAreas([...participantAreas, area]));
  }

  /** Tira uma área participante — a área original nunca pode ser removida por aqui. */
  async removeArea(user: RequestUser, id: number, area: TicketArea): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    const access = await this.resolveAreaAccess(user);
    this.assertCanManageTicketArea(access, current.area, participantAreas, 'remover uma área de');

    await this.repository.removeArea(id, area);

    return this.toFullTicket(
      current,
      participantAreas.filter((candidate) => candidate !== area),
    );
  }

  /**
   * O cargo desta pessoa, área por área — direto do banco, sem o "mínimo `user`" que o cargo
   * interno (#11) aplica em outros lugares: aqui, sem linha, é SEM ACESSO (ver issue #13).
   * Administrador e super administrador continuam enxergando tudo, como em todo o resto do
   * sistema.
   */
  private async resolveAreaAccess(user: RequestUser): Promise<AreaAccess> {
    if (isAdmin(user.role)) {
      return TICKET_AREAS.reduce<AreaAccess>((access, area) => {
        access[area] = 'admin';
        return access;
      }, {});
    }

    return this.repository.contextRolesFor(user.id, user.email);
  }

  /** Ler/atender exige cargo em alguma área do chamado — a original, ou alguma participante. */
  private assertCanSeeTicket(
    access: AreaAccess,
    area: TicketArea,
    participantAreas: readonly TicketArea[],
  ): void {
    if ([area, ...participantAreas].some((candidate) => access[candidate] !== undefined)) return;

    throw new ForbiddenException(
      `Você não tem cargo em ${ticketAreaLabel(area)} nem nas áreas participantes deste chamado.`,
    );
  }

  /** Mudar a área (reclassificar ou somar/tirar participante) exige GESTOR em alguma área. */
  private assertCanManageTicketArea(
    access: AreaAccess,
    area: TicketArea,
    participantAreas: readonly TicketArea[],
    action: string,
  ): void {
    if ([area, ...participantAreas].some((candidate) => canManageAnyRecord(access[candidate]))) {
      return;
    }

    throw new ForbiddenException(
      `Só quem gerencia alguma área deste chamado pode ${action} ele.`,
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

    if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.mimetype)) {
      throw new UnprocessableEntityException('O print precisa ser uma imagem (PNG, JPG ou WEBP).');
    }

    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      throw new UnprocessableEntityException('O print passa de 8 MB. Envie uma imagem menor.');
    }

    const stored = await this.storage.upload({
      fileName: screenshot.originalname,
      contentType: screenshot.mimetype,
      content: screenshot.buffer,
      folder: SCREENSHOT_FOLDER,
    });

    return stored.key;
  }
}
