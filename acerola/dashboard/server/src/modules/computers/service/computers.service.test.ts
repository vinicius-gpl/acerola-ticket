import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type AgentSnapshot } from '@template/shared/schemas/agent-snapshot.schema';
import { computerListQuerySchema } from '@template/shared/schemas/computer.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { AgentPresenceService } from '../presence/agent-presence.service';
import { type ComputersRepository } from '../repository/computers.repository';
import { hashComputerToken } from '../token/computer-token.util';
import { ComputersService } from './computers.service';

const GB = 1024 ** 3;

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };

/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

function computerRow(over: Partial<ComputerRow> = {}): ComputerRow {
  return {
    id: 7,
    name: 'RECEPCAO-01',
    displayName: null,
    responsibleName: null,
    department: null,
    tokenHash: hashComputerToken('token-de-verdade'),
    os: null,
    platform: null,
    platformVersion: null,
    kernelVersion: null,
    arch: null,
    cpuModel: null,
    logicalCpus: null,
    physicalCpus: null,
    totalMemoryBytes: null,
    macAddress: null,
    localIp: null,
    totalDiskBytes: null,
    freeDiskBytes: null,
    uptimeSeconds: null,
    bootTime: null,
    lastSnapshot: null,
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    lastSeenAt: null,
    agentVersion: null,
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    createdBy: ana.email,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function snapshot(over: { cpu?: number; memory?: number; freeDiskBytes?: number } = {}): AgentSnapshot {
  return {
    timestamp: '2026-09-22T12:00:00.000Z',
    host: {
      hostname: 'RECEPCAO-01',
      os: 'windows',
      platform: 'Windows 11',
      platformVersion: '10.0',
      kernelVersion: '10.0',
      arch: 'amd64',
      cpuModel: 'Intel Core i5',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * GB,
      macAddress: '00:11:22:33:44:55',
      localIp: '192.168.0.31',
      totalDiskBytes: 500 * GB,
      freeDiskBytes: over.freeDiskBytes ?? 250 * GB,
      uptimeSeconds: 3600,
      bootTime: '2026-09-22T11:00:00.000Z',
    },
    cpu: { percentTotal: over.cpu ?? 30, percentPerCore: [] },
    memory: {
      totalBytes: 16 * GB,
      usedBytes: 8 * GB,
      freeBytes: 8 * GB,
      usedPercent: over.memory ?? 50,
      swapTotalBytes: 0,
      swapUsedBytes: 0,
      swapUsedPercent: 0,
    },
    disks: [],
    diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
    network: [],
    processes: [
      { name: 'chrome', instanceCount: 9, cpuPercent: 180, memPercent: 12, memBytes: 2 * GB, instances: [] },
      { name: 'explorer', instanceCount: 1, cpuPercent: 1, memPercent: 1, memBytes: GB, instances: [] },
    ],
  };
}

function makeService(repository: Partial<ComputersRepository>, presence = new AgentPresenceService()) {
  return {
    service: new ComputersService(repository as ComputersRepository, presence),
    presence,
  };
}

const query = (overrides: Record<string, unknown> = {}) => computerListQuerySchema.parse(overrides);

describe('ComputersService.list', () => {
  // feliz
  it('returns the page translated into the contract', async () => {
    const { service } = makeService({
      list: vi.fn().mockResolvedValue({ rows: [computerRow()], total: 1 }),
    });

    const page = await service.list(ana, query());

    expect(page.items[0]?.name).toBe('RECEPCAO-01');
    expect(page.total).toBe(1);
  });

  /* Estar online é ter conexão aberta agora — o banco não sabe disso. */
  it('marks as online only the machines with a live connection', async () => {
    const presence = new AgentPresenceService();
    presence.connect(7, 'RECEPCAO-01');
    const { service } = makeService(
      { list: vi.fn().mockResolvedValue({ rows: [computerRow(), computerRow({ id: 8 })], total: 2 }) },
      presence,
    );

    const page = await service.list(ana, query());

    expect(page.items[0]?.isOnline).toBe(true);
    expect(page.items[1]?.isOnline).toBe(false);
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const { service } = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toThrow(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('ComputersService.create', () => {
  // feliz
  it('returns the token once, and stores only its hash', async () => {
    const insert = vi.fn().mockResolvedValue(computerRow());
    const { service } = makeService({ insert });

    const created = await service.create(ana, { name: 'RECEPCAO-01' });

    expect(created.token).toBeTruthy();
    const stored = insert.mock.calls[0]?.[0].tokenHash;
    expect(stored).toBe(hashComputerToken(created.token));
    expect(stored).not.toBe(created.token);
  });

  /* Máquina recém-cadastrada ainda não tem agente instalado. */
  it('reports a freshly registered machine as offline', async () => {
    const { service } = makeService({ insert: vi.fn().mockResolvedValue(computerRow()) });

    expect((await service.create(ana, { name: 'PC-1' })).computer.isOnline).toBe(false);
  });

  // triste
  it('refuses an unidentified request without writing', async () => {
    const insert = vi.fn();
    const { service } = makeService({ insert });

    await expect(service.create(noRole, { name: 'PC-1' })).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('ComputersService.regenerateToken', () => {
  // feliz
  it('gives a new token and stores its hash, invalidating the old one', async () => {
    const update = vi.fn().mockResolvedValue(computerRow());
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(computerRow()), update });

    const created = await service.regenerateToken(ana, 7);

    expect(update.mock.calls[0]?.[1].tokenHash).toBe(hashComputerToken(created.token));
  });

  // triste
  it('does not write when the machine does not exist', async () => {
    const update = vi.fn();
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.regenerateToken(ana, 99)).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('ComputersService.authenticateAgent', () => {
  // feliz
  it('accepts the agent whose token matches the stored hash', async () => {
    const { service } = makeService({
      findByTokenHash: vi.fn().mockResolvedValue(computerRow()),
    });

    const result = await service.authenticateAgent('token-de-verdade');

    expect(result.ok).toBe(true);
  });

  it('looks the machine up by the hash, never by the raw token', async () => {
    const findByTokenHash = vi.fn().mockResolvedValue(computerRow());
    const { service } = makeService({ findByTokenHash });

    await service.authenticateAgent('token-de-verdade');

    expect(findByTokenHash).toHaveBeenCalledWith(hashComputerToken('token-de-verdade'));
  });

  // triste
  it('refuses a token that matches nobody', async () => {
    const { service } = makeService({ findByTokenHash: vi.fn().mockResolvedValue(null) });

    const result = await service.authenticateAgent('token-inventado');

    expect(result).toEqual({ ok: false, reason: 'invalid-token' });
  });

  /* Bloquear é como o TI tira do ar um coletor que não devia enviar, sem caçar o token. */
  it('refuses a blocked machine even with a valid token', async () => {
    const { service } = makeService({
      findByTokenHash: vi.fn().mockResolvedValue(computerRow({ isBlocked: true })),
    });

    const result = await service.authenticateAgent('token-de-verdade');

    expect(result).toEqual({ ok: false, reason: 'blocked' });
  });
});

describe('ComputersService.ingest', () => {
  function ingestService(over: Partial<ComputersRepository> = {}) {
    const update = vi.fn().mockResolvedValue(computerRow());
    const insertSample = vi.fn().mockResolvedValue(undefined);
    const insertAlert = vi.fn().mockResolvedValue(computerRow());
    const updateAlert = vi.fn().mockResolvedValue(undefined);
    const findActiveAlert = vi.fn().mockResolvedValue(null);
    const { service } = makeService({
      update,
      insertSample,
      insertAlert,
      updateAlert,
      findActiveAlert,
      ...over,
    });

    return { service, update, insertSample, insertAlert, updateAlert, findActiveAlert };
  }

  // feliz
  it('records the hardware and the usage sample', async () => {
    const { service, update, insertSample } = ingestService();

    await service.ingest(computerRow(), snapshot(), '1.0.0');

    expect(update.mock.calls[0]?.[1].cpuModel).toBe('Intel Core i5');
    expect(insertSample).toHaveBeenCalledOnce();
  });

  it('opens an alert when a metric crosses the line, blaming the heaviest process', async () => {
    const { service, insertAlert } = ingestService();

    await service.ingest(computerRow(), snapshot({ cpu: 99 }), '1.0.0');

    expect(insertAlert).toHaveBeenCalledOnce();
    expect(insertAlert.mock.calls[0]?.[0]).toMatchObject({ metric: 'cpu', causeProcess: 'chrome' });
  });

  it('closes the open alert once the metric came back down', async () => {
    const { service, updateAlert } = ingestService({
      findActiveAlert: vi
        .fn()
        .mockImplementation((_id: number, metric: string) =>
          metric === 'cpu' ? { id: 55, peakValue: 99 } : null,
        ),
    });

    await service.ingest(computerRow(), snapshot({ cpu: 20 }), '1.0.0');

    expect(updateAlert).toHaveBeenCalledWith(55, expect.objectContaining({ status: 'recovered' }));
  });

  it('raises the peak of an open alert when the reading got worse', async () => {
    const { service, updateAlert } = ingestService({
      findActiveAlert: vi
        .fn()
        .mockImplementation((_id: number, metric: string) =>
          metric === 'cpu' ? { id: 55, peakValue: 98 } : null,
        ),
    });

    await service.ingest(computerRow(), snapshot({ cpu: 100 }), '1.0.0');

    expect(updateAlert).toHaveBeenCalledWith(55, { peakValue: 100 });
  });

  // triste
  it('opens nothing on a calm machine', async () => {
    const { service, insertAlert, updateAlert } = ingestService();

    await service.ingest(computerRow(), snapshot(), '1.0.0');

    expect(insertAlert).not.toHaveBeenCalled();
    expect(updateAlert).not.toHaveBeenCalled();
  });

  /* Escrever a cada leitura alta transformaria um problema de dez minutos em vinte linhas. */
  it('does not write again when an open alert did not get worse', async () => {
    const { service, insertAlert, updateAlert } = ingestService({
      findActiveAlert: vi
        .fn()
        .mockImplementation((_id: number, metric: string) =>
          metric === 'cpu' ? { id: 55, peakValue: 100 } : null,
        ),
    });

    await service.ingest(computerRow(), snapshot({ cpu: 99 }), '1.0.0');

    expect(insertAlert).not.toHaveBeenCalled();
    expect(updateAlert).not.toHaveBeenCalled();
  });

  it('does not open a second alert for a metric that already has one', async () => {
    const { service, insertAlert } = ingestService({
      findActiveAlert: vi
        .fn()
        .mockImplementation((_id: number, metric: string) =>
          metric === 'cpu' ? { id: 55, peakValue: 99 } : null,
        ),
    });

    await service.ingest(computerRow(), snapshot({ cpu: 99 }), '1.0.0');

    expect(insertAlert).not.toHaveBeenCalled();
  });
});

describe('ComputersService.samples', () => {
  // feliz
  it('brings the usage series translated into the contract', async () => {
    const { service } = makeService({
      findById: vi.fn().mockResolvedValue(computerRow()),
      listSamplesSince: vi.fn().mockResolvedValue([
        {
          sampledAt: new Date('2026-09-22T12:00:00.000Z'),
          cpuPercent: 30,
          memoryPercent: 50,
          diskPercent: 40,
          networkBytesPerSec: 100,
        },
      ]),
    });

    const samples = await service.samples(ana, 7);

    expect(samples[0]?.sampledAt).toBe('2026-09-22T12:00:00.000Z');
  });

  // triste
  it('says the machine was not found instead of returning an empty chart', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.samples(ana, 99)).rejects.toThrow(NotFoundException);
  });

  it('refuses an unidentified request', async () => {
    const { service } = makeService({ findById: vi.fn() });

    await expect(service.samples(noRole, 7)).rejects.toThrow(ForbiddenException);
  });
});
