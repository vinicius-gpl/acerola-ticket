import { describe, expect, it } from 'vitest';

import { agentMessageSchema, agentSnapshotSchema } from './agent-snapshot.schema';

/** O mínimo que o agente em Go manda — os mesmos nomes das tags `json` de `types.go`. */
const snapshot = {
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
    totalMemoryBytes: 17179869184,
    macAddress: '00:11:22:33:44:55',
    localIp: '192.168.0.31',
    totalDiskBytes: 512110190592,
    freeDiskBytes: 210000000000,
    uptimeSeconds: 86400,
    bootTime: '2026-09-21T12:00:00.000Z',
  },
  cpu: { percentTotal: 23.5, percentPerCore: [20, 27] },
  memory: {
    totalBytes: 17179869184,
    usedBytes: 8589934592,
    freeBytes: 8589934592,
    usedPercent: 50,
    swapTotalBytes: 0,
    swapUsedBytes: 0,
    swapUsedPercent: 0,
  },
  disks: [
    {
      mountpoint: 'C:',
      fstype: 'NTFS',
      totalBytes: 512110190592,
      usedBytes: 302110190592,
      freeBytes: 210000000000,
      usedPercent: 59,
    },
  ],
  diskIo: { readBytesPerSec: 1024, writeBytesPerSec: 2048 },
  network: [{ name: 'Ethernet', bytesSentPerSec: 500, bytesRecvPerSec: 1500 }],
  processes: [
    {
      name: 'chrome',
      instanceCount: 14,
      cpuPercent: 180.5,
      memPercent: 15.2,
      memBytes: 2600000000,
      instances: [{ pid: 4242, cpuPercent: 12.5, memPercent: 1.2, memBytes: 210000000 }],
    },
  ],
};

describe('agentSnapshotSchema', () => {
  // feliz
  it('accepts what the Go agent sends, field for field', () => {
    const parsed = agentSnapshotSchema.parse(snapshot);

    expect(parsed.host.hostname).toBe('RECEPCAO-01');
    expect(parsed.processes[0]?.instanceCount).toBe(14);
  });

  /* Um aplicativo somado em vários núcleos passa de 100% e isso é correto, não erro. */
  it('accepts process CPU above one hundred, since it sums every core', () => {
    expect(agentSnapshotSchema.parse(snapshot).processes[0]?.cpuPercent).toBe(180.5);
  });

  it('fills the lists in when the machine has nothing to report on one of them', () => {
    const bare = { ...snapshot, disks: undefined, network: undefined, processes: undefined };

    const parsed = agentSnapshotSchema.parse(bare);

    expect(parsed.disks).toEqual([]);
    expect(parsed.network).toEqual([]);
  });

  // triste
  /* Contador de sistema operacional não volta negativo: se voltou, algo leu errado. */
  it('refuses a negative byte counter instead of turning it into a chart', () => {
    const broken = { ...snapshot, host: { ...snapshot.host, totalMemoryBytes: -1 } };

    expect(agentSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it('refuses a CPU percentage above one hundred for the machine as a whole', () => {
    const broken = { ...snapshot, cpu: { ...snapshot.cpu, percentTotal: 250 } };

    expect(agentSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it('refuses a machine with no name, which could not be matched to a record', () => {
    const broken = { ...snapshot, host: { ...snapshot.host, hostname: '' } };

    expect(agentSnapshotSchema.safeParse(broken).success).toBe(false);
  });
});

describe('agentMessageSchema', () => {
  // feliz
  it('reads the opening message, where the agent proves who it is', () => {
    const parsed = agentMessageSchema.parse({ type: 'hello', token: 'abc123', agentVersion: '1.0' });

    expect(parsed.type).toBe('hello');
  });

  it('reads a reading sent after the connection was accepted', () => {
    const parsed = agentMessageSchema.parse({ type: 'snapshot', snapshot });

    expect(parsed.type).toBe('snapshot');
  });

  it('accepts an agent that did not say its version', () => {
    const parsed = agentMessageSchema.parse({ type: 'hello', token: 'abc123' });

    expect(parsed).toMatchObject({ agentVersion: 'desconhecida' });
  });

  // triste
  it('refuses a hello with no token, which proves nothing', () => {
    expect(agentMessageSchema.safeParse({ type: 'hello', token: '' }).success).toBe(false);
  });

  /* Sem `type` o servidor teria que adivinhar pela forma — e adivinhar em fronteira de rede
     é como um campo novo vira erro silencioso. */
  it('refuses a message that does not say what it is', () => {
    expect(agentMessageSchema.safeParse({ snapshot }).success).toBe(false);
  });

  it('refuses a kind of message the server does not know', () => {
    expect(agentMessageSchema.safeParse({ type: 'shutdown' }).success).toBe(false);
  });
});
