import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  classifyEvent,
  defaultSeverityOf,
  type NetworkEventType,
} from '@template/shared/domain/network-event.util';
import {
  type CreateNetworkEventInput,
  type NetworkEvent,
  type NetworkEventListQuery,
  type NetworkSummary,
  type NetworkWebhookPayload,
} from '@template/shared/schemas/network-event.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { assertCanCreate, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { Inject } from '@nestjs/common';
import { toNetworkEvent, toWebhookInsert } from '../mapper/network.mapper';
import { NetworkRepository } from '../repository/network.repository';

const NOT_FOUND = 'Evento de rede não encontrado. Recarregue a lista.';

const DEFAULT_PERIOD_DAYS = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * O ÚNICO caminho de escrita de evento de rede.
 *
 * Duas fronteiras diferentes convivem aqui, como no módulo de computadores:
 *
 * - `list`, `summary`, `create` e `resolve` são da tela, e começam pela policy.
 * - `ingest` é do UNIFI, que não é uma pessoa. A proteção dele é o token do webhook, e ele
 *   só consegue CRIAR evento — nada do que já está registrado pode ser alterado por lá.
 */
@Injectable()
export class NetworkService {
  constructor(
    private readonly repository: NetworkRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(user: RequestUser, query: NetworkEventListQuery): Promise<Paginated<NetworkEvent>> {
    assertCanRead(user.role, 'os eventos de rede');

    const page = await this.repository.list(query);

    return {
      items: page.rows.map(toNetworkEvent),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async summary(user: RequestUser, days = DEFAULT_PERIOD_DAYS): Promise<NetworkSummary> {
    assertCanRead(user.role, 'os eventos de rede');

    const totals = await this.repository.totals(new Date(Date.now() - days * MILLISECONDS_PER_DAY));

    return {
      days,
      ...totals,
      totalOutageSeconds:
        totals.totalOutageSeconds === null ? null : Math.round(totals.totalOutageSeconds),
    };
  }

  /** Registrar uma queda à mão — para quando ela não veio pelo UniFi. */
  async create(user: RequestUser, input: CreateNetworkEventInput): Promise<NetworkEvent> {
    assertCanCreate(user.role, 'eventos de rede');

    const type = input.type as NetworkEventType;

    const row = await this.repository.insert({
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      type,
      severity: input.severity ?? defaultSeverityOf(type),
      title: input.title.trim(),
      message: input.message ?? null,
      linkName: input.linkName ?? null,
      source: 'Manual',
    });

    return toNetworkEvent(row);
  }

  /**
   * Marca como resolvido, ou reabre.
   *
   * Resolver NÃO apaga o evento: ele continua no histórico, porque "a internet caiu três
   * vezes este mês" é uma pergunta que só o histórico responde.
   */
  async resolve(user: RequestUser, id: number, isResolved: boolean): Promise<NetworkEvent> {
    assertCanCreate(user.role, 'eventos de rede');

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const row = await this.repository.update(id, {
      resolvedAt: isResolved ? (current.resolvedAt ?? new Date()) : null,
      resolvedBy: isResolved ? user.email : null,
    });

    return toNetworkEvent(row);
  }

  /**
   * A porta do UNIFI: grava o alerta que o controlador mandou.
   *
   * O token é conferido AQUI, e não num guard: quem chama é uma rota pública, e a decisão de
   * aceitar ou recusar é regra — não roteamento.
   *
   * **Sem a variável configurada, a porta fica fechada.** Deixá-la aberta "porque ninguém
   * configurou ainda" seria publicar um endereço onde qualquer um grava evento de rede.
   */
  async ingest(token: string | undefined, payload: NetworkWebhookPayload): Promise<NetworkEvent> {
    const expected = this.env.UNIFI_WEBHOOK_TOKEN;

    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Token do webhook inválido.');
    }

    const title = payload.title ?? payload.alert ?? payload.event ?? 'Aviso do UniFi';
    const type = payload.type ?? classifyEvent(`${title} ${payload.message ?? payload.text ?? ''}`);

    return toNetworkEvent(await this.repository.insert(toWebhookInsert(payload, title, type)));
  }
}
