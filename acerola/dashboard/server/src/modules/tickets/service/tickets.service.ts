import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { parseTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import {
  countByField,
  summarizeTickets,
  type TicketSummary,
} from '@template/shared/domain/ticket-metrics.util';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type CreateTicketInput,
  type PublicTicket,
  type Ticket,
  type TicketListQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { StorageService } from '../../../lib/storage/storage.service';
import { toPublicTicket, toTicket, toTicketInsert, toTicketUpdate } from '../mapper/tickets.mapper';
import { TicketsRepository } from '../repository/tickets.repository';

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
  ) {}

  async list(user: RequestUser, query: TicketListQuery): Promise<Paginated<Ticket>> {
    assertCanRead(user.role, 'os chamados');

    const page = await this.repository.list(query);
    const items = await Promise.all(page.rows.map((row) => this.withScreenshot(row)));

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async findById(user: RequestUser, id: number): Promise<Ticket> {
    assertCanRead(user.role, 'os chamados');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

    return this.withScreenshot(row);
  }

  /** Os indicadores do painel, sobre TODOS os chamados — não só sobre a página aberta. */
  async dashboard(user: RequestUser): Promise<TicketDashboard> {
    assertCanRead(user.role, 'os chamados');

    const rows = await this.repository.listForMetrics();
    const measurable = rows.map((row) => ({
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    }));

    return {
      ...summarizeTickets(measurable),
      byProblemType: countByField(rows, (row) => row.problemType),
      byDepartment: countByField(rows, (row) => row.department),
    };
  }

  /**
   * Abrir chamado — PÚBLICO. Não há identidade: quem pediu é o que a pessoa digitou.
   *
   * O print é guardado ANTES do chamado existir. Se a gravação do chamado falhar depois,
   * sobra um arquivo órfão no bucket — o contrário (chamado apontando para um arquivo que
   * não subiu) mostraria uma imagem quebrada para o TI, e essa é a falha pior.
   */
  async create(input: CreateTicketInput, screenshot?: UploadedScreenshot): Promise<Ticket> {
    const screenshotKey = await this.storeScreenshot(screenshot);
    const row = await this.repository.insert(toTicketInsert(input, screenshotKey));

    return this.withScreenshot(row);
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

    return toPublicTicket(row, await this.screenshotUrl(row));
  }

  async update(user: RequestUser, id: number, input: UpdateTicketInput): Promise<Ticket> {
    assertCanAttendTicket(user.role);

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const row = await this.repository.update(id, toTicketUpdate(input, user.email, current));

    return this.withScreenshot(row);
  }

  private async withScreenshot(row: TicketRow): Promise<Ticket> {
    return toTicket(row, await this.screenshotUrl(row));
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
