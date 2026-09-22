import { type AgentSnapshot } from '@template/shared/schemas/agent-snapshot.schema';
import { describe, expect, it } from 'vitest';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import {
  toComputer,
  toComputerInsert,
  toComputerUpdate,
  toSample,
  toSnapshotUpdate,
} from './computers.mapper';

const GB = 1024 ** 3;
const NOW = new Date('2026-09-22T12:00:00.000Z');
const ANA = 'ana@azuos.com.br';

function computerRow(over: Partial<ComputerRow> = {}): ComputerRow {
  return {
    id: 1,
    name: 'RECEPCAO-01',
    displayName: null,
    responsibleName: null,
    department: null,
    tokenHash: 'hash-secreto',
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
    createdBy: ANA,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function snapshot(over: Partial<AgentSnapshot['host']> = {}): AgentSnapshot {
  return {
    timestamp: '2026-09-22T12:00:00.000Z',
    host: {
      hostname: 'RECEPCAO-01',
      os: 'windows',
      platform: 'Microsoft Windows 11 Pro',
      platformVersion: '10.0.22631',
      kernelVersion: '10.0.22631',
      arch: 'amd64',
      cpuModel: 'Intel Core i5-10400',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * GB,
      macAddress: '00:11:22:33:44:55',
      localIp: '192.168.0.31',
      totalDiskBytes: 500 * GB,
      freeDiskBytes: 250 * GB,
      uptimeSeconds: 3600,
      bootTime: '2026-09-22T11:00:00.000Z',
      ...over,
    },
    cpu: { percentTotal: 30, percentPerCore: [25, 35] },
    memory: {
      totalBytes: 16 * GB,
      usedBytes: 8 * GB,
      freeBytes: 8 * GB,
      usedPercent: 50,
      swapTotalBytes: 0,
      swapUsedBytes: 0,
      swapUsedPercent: 0,
    },
    disks: [],
    diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
    network: [
      { name: 'Ethernet', bytesSentPerSec: 100, bytesRecvPerSec: 400 },
      { name: 'Wi-Fi', bytesSentPerSec: 50, bytesRecvPerSec: 50 },
    ],
    processes: [],
  };
}

describe('toComputer', () => {
  // feliz
  it('publishes dates as ISO text, so every screen reads the same format', () => {
    const computer = toComputer(computerRow({ lastSeenAt: NOW }), true);

    expect(computer.lastSeenAt).toBe('2026-09-22T12:00:00.000Z');
    expect(computer.createdAt).toBe('2026-09-20T10:00:00.000Z');
  });

  /* Estar online é ter conexão aberta agora — o banco não tem como saber disso. */
  it('takes online from the live connection it was given, not from the row', () => {
    expect(toComputer(computerRow(), true).isOnline).toBe(true);
    expect(toComputer(computerRow(), false).isOnline).toBe(false);
  });

  it('reports a machine that never connected with empty hardware, not with zeros', () => {
    const computer = toComputer(computerRow(), false);

    expect(computer.hardware.cpuModel).toBeNull();
    expect(computer.hardware.totalMemoryBytes).toBeNull();
  });

  // triste
  /* O hash é a credencial da máquina: ele nunca pode sair do servidor. */
  it('never publishes the token hash', () => {
    const computer = toComputer(computerRow(), false);

    expect(JSON.stringify(computer)).not.toContain('hash-secreto');
  });

  /* `warnings` é jsonb: uma linha antiga pode trazer qualquer coisa ali. */
  it('survives a warnings column that is not a list', () => {
    const computer = toComputer(computerRow({ warnings: 'estragado' }), false);

    expect(computer.warnings).toEqual([]);
  });
});

describe('toComputerInsert', () => {
  // feliz
  it('registers the machine with the hash it was given', () => {
    const values = toComputerInsert({ name: '  PC-1  ' }, 'hash-abc', ANA);

    expect(values.name).toBe('PC-1');
    expect(values.tokenHash).toBe('hash-abc');
    expect(values.createdBy).toBe(ANA);
  });

  // triste
  /* Hardware chega medido, na primeira conexão — nunca digitado no cadastro. */
  it('sets no hardware at registration', () => {
    const values = toComputerInsert({ name: 'PC-1' }, 'hash-abc', ANA);

    expect(values).not.toHaveProperty('cpuModel');
    expect(values).not.toHaveProperty('totalMemoryBytes');
  });
});

describe('toComputerUpdate', () => {
  // feliz
  it('always stamps who touched it and when', () => {
    const update = toComputerUpdate({ responsibleName: 'Helena' }, ANA, NOW);

    expect(update.updatedBy).toBe(ANA);
    expect(update.updatedAt).toBe(NOW);
  });

  it('clears an emptied nickname, so the field can actually be wiped', () => {
    expect(toComputerUpdate({ displayName: '  ' }, ANA, NOW).displayName).toBeNull();
  });

  // triste
  /* Motivo de bloqueio sobrando acusaria um bloqueio que não existe mais. */
  it('clears the block reason when the machine is unblocked', () => {
    const update = toComputerUpdate({ isBlocked: false }, ANA, NOW);

    expect(update.blockReason).toBeNull();
  });

  it('keeps the reason when the machine is being blocked', () => {
    const update = toComputerUpdate({ isBlocked: true, blockReason: 'Não autorizada' }, ANA, NOW);

    expect(update.blockReason).toBe('Não autorizada');
  });

  it('touches nothing but the stamps when the change is empty', () => {
    expect(toComputerUpdate({}, ANA, NOW)).toEqual({ updatedAt: NOW, updatedBy: ANA });
  });
});

describe('toSnapshotUpdate', () => {
  // feliz
  it('copies the measured hardware onto the record', () => {
    const update = toSnapshotUpdate(snapshot(), '1.0.0', NOW);

    expect(update.cpuModel).toBe('Intel Core i5-10400');
    expect(update.totalMemoryBytes).toBe(16 * GB);
    expect(update.agentVersion).toBe('1.0.0');
    expect(update.lastSeenAt).toBe(NOW);
  });

  /* A régua é decisão do servidor: foi o que permitiu tirá-la do script de cada máquina. */
  it('recalculates the health on every reading, instead of trusting the agent', () => {
    const update = toSnapshotUpdate(snapshot(), '1.0.0', NOW);

    expect(update.healthScore).toBe(100);
    expect(update.healthStatus).toBe('good');
  });

  it('lowers the health when the machine reports a nearly full disk', () => {
    const update = toSnapshotUpdate(snapshot({ freeDiskBytes: 5 * GB }), '1.0.0', NOW);

    expect(update.healthStatus).toBe('critical');
    expect(update.warnings).toHaveLength(1);
  });

  it('keeps the whole reading for the detail screen', () => {
    expect(toSnapshotUpdate(snapshot(), '1.0.0', NOW).lastSnapshot).toBeTruthy();
  });

  // triste
  /* O nome é a chave de encontro: alterá-lo por um envio faria a máquina trocar de ficha. */
  it('never changes the machine name from a reading', () => {
    expect(toSnapshotUpdate(snapshot(), '1.0.0', NOW)).not.toHaveProperty('name');
  });

  it('never changes the identification the IT team typed', () => {
    const update = toSnapshotUpdate(snapshot(), '1.0.0', NOW);

    expect(update).not.toHaveProperty('displayName');
    expect(update).not.toHaveProperty('responsibleName');
    expect(update).not.toHaveProperty('department');
  });
});

describe('toSample', () => {
  // feliz
  it('keeps the four numbers the chart needs, and the instant', () => {
    const sample = toSample(7, snapshot());

    expect(sample.computerId).toBe(7);
    expect(sample.cpuPercent).toBe(30);
    expect(sample.memoryPercent).toBe(50);
    expect(sample.diskPercent).toBe(50);
  });

  /* Numa máquina com cabo e Wi-Fi interessa quanto tráfego houve, não por onde. */
  it('sums every interface into one network number', () => {
    expect(toSample(7, snapshot()).networkBytesPerSec).toBe(600);
  });

  // triste
  /* Dividir por zero daria NaN, e NaN no banco quebra o gráfico inteiro. */
  it('reports zero disk usage instead of dividing by a disk of size zero', () => {
    const sample = toSample(7, snapshot({ totalDiskBytes: 0, freeDiskBytes: 0 }));

    expect(sample.diskPercent).toBe(0);
  });

  it('reports no network traffic as zero, not as missing', () => {
    const quiet = { ...snapshot(), network: [] };

    expect(toSample(7, quiet).networkBytesPerSec).toBe(0);
  });
});
