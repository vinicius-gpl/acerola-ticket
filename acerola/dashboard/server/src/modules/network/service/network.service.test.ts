import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { networkEventListQuerySchema } from '@template/shared/schemas/network-event.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { type NetworkEventRow } from '../../../lib/db/schema/network-events.schema';
import { type NetworkRepository } from '../repository/network.repository';
import { NetworkService } from './network.service';

const ana: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const TOKEN = 'segredo-bem-longo-do-webhook';

function eventRow(over: Partial<NetworkEventRow> = {}): NetworkEventRow {
  return {
    id: 1,
    occurredAt: new Date('2026-09-23T12:00:00.000Z'),
    type: 'wan_down',
    severity: 'critical',
    title: 'WAN Offline',
    message: null,
    linkName: 'WAN1',
    provider: null,
    latencyMs: null,
    packetLossPercent: null,
    source: 'UniFi',
    resolvedAt: null,
    resolvedBy: null,
    raw: null,
    createdAt: new Date('2026-09-23T12:00:05.000Z'),
    ...over,
  };
}

function makeService(
  repository: Partial<NetworkRepository> = {},
  env: Partial<Env> = { UNIFI_WEBHOOK_TOKEN: TOKEN },
) {
  const base = {
    list: vi.fn().mockResolvedValue({ rows: [eventRow()], total: 1 }),
    findById: vi.fn().mockResolvedValue(eventRow()),
    insert: vi.fn().mockResolvedValue(eventRow()),
    update: vi.fn().mockResolvedValue(eventRow()),
    totals: vi.fn().mockResolvedValue({
      open: 1,
      outages: 2,
      totalOutageSeconds: 1800.4,
      worstLatencyMs: 320,
      worstPacketLossPercent: 12,
    }),
    ...repository,
  };

  return {
    service: new NetworkService(base as unknown as NetworkRepository, env as Env),
    repository: base,
  };
}

const query = (overrides: Record<string, unknown> = {}) =>
  networkEventListQuerySchema.parse(overrides);

describe('NetworkService.list', () => {
  // feliz
  it('returns the page translated into the contract', async () => {
    const { service } = makeService();

    const page = await service.list(ana, query());

    expect(page.items[0]?.title).toBe('WAN Offline');
    expect(page.items[0]?.occurredAt).toBe('2026-09-23T12:00:00.000Z');
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const { service } = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toBeInstanceOf(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('NetworkService.summary', () => {
  // feliz
  it('rounds the total time off the air to whole seconds', async () => {
    const { service } = makeService();

    const summary = await service.summary(ana, 30);

    expect(summary.totalOutageSeconds).toBe(1800);
    expect(summary.days).toBe(30);
  });

  // triste
  /* Sem queda no período, nulo — zero diria que houve queda de duração zero. */
  it('keeps the time off the air empty when there was no outage', async () => {
    const { service } = makeService({
      totals: vi.fn().mockResolvedValue({
        open: 0,
        outages: 0,
        totalOutageSeconds: null,
        worstLatencyMs: null,
        worstPacketLossPercent: null,
      }),
    });

    expect((await service.summary(ana)).totalOutageSeconds).toBeNull();
  });
});

describe('NetworkService.resolve', () => {
  // feliz
  it('stamps who resolved it and when', async () => {
    const update = vi.fn().mockResolvedValue(eventRow({ resolvedAt: new Date() }));
    const { service } = makeService({ update });

    await service.resolve(ana, 1, true);

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ resolvedBy: 'ana@empresa.com.br' }),
    );
    expect(vi.mocked(update).mock.calls[0]?.[1].resolvedAt).toBeInstanceOf(Date);
  });

  /* Reabrir limpa quem resolveu junto: um nome pendurado num evento reaberto contaria uma
     história que já não é verdade. */
  it('clears the resolution when the event is reopened', async () => {
    const update = vi.fn().mockResolvedValue(eventRow());
    const { service } = makeService({ update });

    await service.resolve(ana, 1, false);

    expect(update).toHaveBeenCalledWith(1, { resolvedAt: null, resolvedBy: null });
  });

  // triste
  it('answers not found, without writing, when the event is gone', async () => {
    const update = vi.fn();
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.resolve(ana, 99, true)).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('NetworkService.ingest', () => {
  // feliz
  it('records the alert the UniFi sent, reading the type from the text', async () => {
    const insert = vi.fn().mockResolvedValue(eventRow());
    const { service } = makeService({ insert });

    await service.ingest(TOKEN, { title: 'WAN Offline', wan: 'WAN1' });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'wan_down', severity: 'critical', linkName: 'WAN1' }),
    );
  });

  /* O corpo inteiro é guardado: o dia em que um campo novo importar, ele vai estar ali. */
  it('keeps the whole body that arrived, unknown fields included', async () => {
    const insert = vi.fn().mockResolvedValue(eventRow());
    const { service } = makeService({ insert });

    await service.ingest(TOKEN, { title: 'WAN Offline', siteId: 'default' } as never);

    expect(vi.mocked(insert).mock.calls[0]?.[0].raw).toMatchObject({ siteId: 'default' });
  });

  it('accepts an alert with no title at all, instead of losing it', async () => {
    const insert = vi.fn().mockResolvedValue(eventRow());
    const { service } = makeService({ insert });

    await service.ingest(TOKEN, {});

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Aviso do UniFi', type: 'other' }),
    );
  });

  // triste
  it('refuses a wrong token, without writing', async () => {
    const insert = vi.fn();
    const { service } = makeService({ insert });

    await expect(service.ingest('outro-token', { title: 'WAN Offline' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  /* Sem a variável configurada a porta fica FECHADA: deixá-la aberta "porque ninguém
     configurou ainda" seria publicar um endereço onde qualquer um grava evento de rede. */
  it('stays shut when the secret was never configured', async () => {
    const insert = vi.fn();
    const { service } = makeService({ insert }, { UNIFI_WEBHOOK_TOKEN: undefined });

    await expect(service.ingest('qualquer-coisa', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a request with no token at all', async () => {
    const insert = vi.fn();
    const { service } = makeService({ insert });

    await expect(service.ingest(undefined, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(insert).not.toHaveBeenCalled();
  });
});
