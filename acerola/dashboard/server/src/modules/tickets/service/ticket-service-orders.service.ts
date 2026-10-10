import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { normalizeServiceOrderReference } from '@template/shared/domain/service-order.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type TicketServiceOrderRow } from '../../../lib/db/schema/ticket-service-orders.schema';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { type BuiltDocument } from '../../../lib/report/document.type';
import {
  type ServiceOrderDraft,
  toIssue,
  toPublicServiceOrder,
  toServiceOrderInsert,
} from '../mapper/ticket-service-orders.mapper';
import { buildServiceOrderPdf, type ServiceOrder } from '../report/ticket-service-order.pdf';
import { TicketServiceOrdersRepository } from '../repository/ticket-service-orders.repository';
import { TicketAccessService } from './ticket-access.service';
import { TicketHistoriesService } from './ticket-histories.service';

/** 32 bytes aleatórios: o código da emissão, que ninguém adivinha. */
const CODE_BYTES = 32;

export const SERVICE_ORDER_NOT_FOUND =
  'Não encontrei uma ordem de serviço com este código. Confira se ele foi copiado inteiro.';

/**
 * A EMISSÃO da ordem de serviço — o documento que sai do sistema e pode ser conferido depois.
 *
 * O PDF **não é guardado**: guarda-se a impressão digital dele (SHA-256). Isso funciona porque
 * o desenho do documento é determinístico — a mesma ordem com a mesma emissão dá o mesmo
 * arquivo, byte a byte. Conferir é calcular a impressão digital do arquivo que a pessoa tem e
 * comparar com a registrada.
 */
@Injectable()
export class TicketServiceOrdersService {
  constructor(
    private readonly repository: TicketServiceOrdersRepository,
    private readonly access: TicketAccessService,
    private readonly histories: TicketHistoriesService,
    @Inject(ENV) private readonly env: Pick<Env, 'API_CORS_ORIGIN'>,
  ) {}

  /**
   * Emite a ordem de serviço do chamado.
   *
   * Quem pode: quem enxerga o chamado — ter cargo em alguma área dele (`access.reach`). Uma
   * pessoa de Sistema não emite documento de um chamado só de Manutenção.
   *
   * Quando NADA mudou desde a última emissão, devolve o MESMO documento, sem registro novo:
   * clicar dez vezes não cria dez versões. A pergunta "mudou?" é feita do jeito mais direto
   * que existe — redesenhar a última emissão e ver se a impressão digital ainda bate.
   */
  async issue(user: RequestUser, ticketId: number): Promise<BuiltDocument> {
    assertCanRead(user.role, 'os chamados');

    const reach = await this.access.reach(user, ticketId);
    const order: ServiceOrder = {
      ticket: reach.ticket,
      protocol: formatTicketProtocol(ticketId),
      histories: await this.histories.list(user, ticketId),
    };

    const latest = await this.repository.latestOf(ticketId);
    const unchanged = latest ? await this.redraw(order, latest) : null;
    if (unchanged) return toReport(order, unchanged);

    const draft: ServiceOrderDraft = {
      version: (latest?.version ?? 0) + 1,
      code: randomBytes(CODE_BYTES).toString('hex'),
      issuedAt: new Date(),
      issuedByName: user.name,
    };
    const buffer = await buildServiceOrderPdf(order, { ...draft, webOrigin: this.webOrigin() });

    await this.repository.record(toServiceOrderInsert(order, draft, fingerprintOf(buffer), user.email));

    return toReport(order, buffer);
  }

  /**
   * O registro público de uma emissão, pelo código — o inteiro ou a versão curta.
   *
   * Sem policy: é a conferência, e quem confere um papel não tem conta no painel. Só LÊ: nada
   * é gravado por esta rota, então ela não serve para encher o banco.
   *
   * Código que não existe e código curto que serve para mais de uma emissão dão a MESMA
   * resposta: dizer "é ambíguo" confirmaria que aquele começo existe.
   */
  async verify(reference: string): Promise<PublicServiceOrder> {
    const normalized = normalizeServiceOrderReference(reference);
    if (!normalized) throw new NotFoundException(SERVICE_ORDER_NOT_FOUND);

    const [row, another] = await this.repository.findByReference(normalized);
    if (!row || another) throw new NotFoundException(SERVICE_ORDER_NOT_FOUND);

    const latest = await this.repository.latestOf(row.ticketId);

    return toPublicServiceOrder(row, latest?.version ?? row.version);
  }

  /** Redesenha a última emissão com o chamado de AGORA. O arquivo, se ainda for o mesmo. */
  private async redraw(order: ServiceOrder, latest: TicketServiceOrderRow): Promise<Buffer | null> {
    const buffer = await buildServiceOrderPdf(order, toIssue(latest, this.webOrigin()));

    return fingerprintOf(buffer) === latest.fileHash ? buffer : null;
  }

  /**
   * O endereço da TELA, para o link de conferência impresso no documento.
   *
   * É o primeiro endereço de `API_CORS_ORIGIN` — a lista de onde a tela é servida. Uma variável
   * nova só para isso seria a mesma informação em dois lugares, à espera de divergir.
   */
  private webOrigin(): string {
    const [first = ''] = this.env.API_CORS_ORIGIN.split(',');

    return first.trim().replace(/\/+$/, '');
  }
}

/** A impressão digital do arquivo: SHA-256, em hexadecimal. */
export function fingerprintOf(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function toReport(order: ServiceOrder, buffer: Buffer): BuiltDocument {
  return {
    buffer,
    fileName: `ordem-de-servico-${order.protocol}.pdf`,
    contentType: 'application/pdf',
  };
}
