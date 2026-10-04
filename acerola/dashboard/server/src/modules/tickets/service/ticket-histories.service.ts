import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  nextTicketStatus,
  refuseTicketHistory,
} from '@template/shared/domain/ticket-history.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import {
  type PublicTicketHistory,
  type TicketHistory,
} from '@template/shared/schemas/ticket-history.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketHistoryRow } from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import {
  type HistoryEntry,
  toHistoryInsert,
  toOpeningHistory,
  toPublicTicketHistory,
  toTicketHistory,
  toTicketMove,
} from '../mapper/ticket-histories.mapper';
import { TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketAccessService, type TicketInReach } from './ticket-access.service';
import { TicketAttachmentsService, type UploadedAttachment } from './ticket-attachments.service';

/**
 * A LINHA DO TEMPO do chamado — a ordem de serviço. É o ÚNICO caminho que muda o estágio de um
 * chamado: lançar um histórico.
 *
 * As regras de qual tipo cabe em qual estágio NÃO moram aqui: são do domínio
 * (`ticket-history.util`), e é a mesma função que o formulário usa para esconder a opção.
 */
@Injectable()
export class TicketHistoriesService {
  constructor(
    private readonly repository: TicketHistoriesRepository,
    private readonly access: TicketAccessService,
    private readonly attachments: TicketAttachmentsService,
  ) {}

  /** A linha do tempo inteira, para o painel. */
  async list(user: RequestUser, ticketId: number): Promise<TicketHistory[]> {
    assertCanRead(user.role, 'os chamados');
    await this.access.reach(user, ticketId);

    return this.timelineOf(ticketId);
  }

  /**
   * A linha do tempo que QUEM ABRIU enxerga na consulta por protocolo: só os históricos
   * marcados como visíveis, sem a identidade de quem escreveu nem o tempo gasto.
   *
   * Os arquivos entram por parâmetro porque quem chama já os leu — e é dos visíveis que eles
   * saem: o anexo de um histórico escondido fica escondido junto.
   */
  async listPublic(
    ticketId: number,
    attachments: readonly TicketAttachment[],
  ): Promise<PublicTicketHistory[]> {
    const rows = await this.repository.listByTicket(ticketId, { visibleToRequesterOnly: true });

    return withAttachments(rows, attachments).map(toPublicTicketHistory);
  }

  /** A abertura — registrada pelo sistema quando o chamado nasce. Sem policy: é pública. */
  async recordOpening(ticket: TicketRow): Promise<void> {
    await this.repository.record(toOpeningHistory(ticket));
  }

  /**
   * Lança um histórico — e, com ele, muda o estágio do chamado quando o tipo leva a outro.
   *
   * Os arquivos são conferidos ANTES de qualquer gravação: recusar um PDF grande demais depois
   * de o histórico existir deixaria na linha do tempo um "segue a nota em anexo" sem anexo.
   */
  async create(
    user: RequestUser,
    ticketId: number,
    entry: HistoryEntry,
    files: readonly UploadedAttachment[] = [],
  ): Promise<TicketHistory> {
    assertCanAttendTicket(user.role);

    const reach = await this.access.reach(user, ticketId);
    this.access.assertCanWrite(reach);
    this.assertFits(reach, entry);
    this.attachments.assertAcceptable(files);

    const author = { name: user.name, email: user.email };
    const row = await this.repository.record(
      toHistoryInsert(reach.ticket, entry, author),
      toTicketMove(reach.ticket, entry, author),
    );

    const saved = await this.attachments.attach(ticketId, files, user.email, 'support', row.id);

    return toTicketHistory(row, saved);
  }

  /**
   * O histórico CABE neste chamado, e quem pede PODE lançá-lo?
   *
   * Cruzar a fronteira do encerramento — encerrar, ou reabrir o que estava encerrado — é
   * exclusivo de quem administra a área. A pergunta é feita pelo estágio de antes e de depois,
   * e não pelo nome do tipo: um tipo novo que encerre já nasce com a mesma trava.
   */
  private assertFits(reach: TicketInReach, entry: HistoryEntry): void {
    const current = reach.ticket.status;

    const refusal = refuseTicketHistory(current, entry.type);
    if (refusal) throw new UnprocessableEntityException(refusal);

    const next = nextTicketStatus(current, entry.type);
    if (isClosedTicketStatus(current) !== isClosedTicketStatus(next)) {
      this.access.assertCanFinalize(reach);
    }
  }

  private async timelineOf(ticketId: number): Promise<TicketHistory[]> {
    const [rows, attachments] = await Promise.all([
      this.repository.listByTicket(ticketId),
      this.attachments.list(ticketId),
    ]);

    return withAttachments(rows, attachments);
  }
}

/** Cada histórico com os arquivos que foram anexados junto dele. */
function withAttachments(
  rows: readonly TicketHistoryRow[],
  attachments: readonly TicketAttachment[],
): TicketHistory[] {
  return rows.map((row) =>
    toTicketHistory(
      row,
      attachments.filter((attachment) => attachment.historyId === row.id),
    ),
  );
}
