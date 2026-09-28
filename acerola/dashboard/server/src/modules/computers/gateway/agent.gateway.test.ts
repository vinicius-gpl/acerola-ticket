import { describe, expect, it, vi } from 'vitest';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { AgentPresenceService } from '../presence/agent-presence.service';
import { LiveWatchService } from '../presence/live-watch.service';
import { type ComputersService } from '../service/computers.service';
import { AgentGateway } from './agent.gateway';

const computer = { id: 7, name: 'RECEPCAO-01' } as ComputerRow;

const snapshot = {
  timestamp: '2026-09-28T12:00:00.000Z',
  host: {
    hostname: 'RECEPCAO-01',
    os: 'windows',
    platform: 'Windows 11',
    platformVersion: '10.0.22631',
    kernelVersion: '10.0.22631',
    arch: 'amd64',
    cpuModel: 'Intel Core i5',
    logicalCpus: 12,
    physicalCpus: 6,
    totalMemoryBytes: 16_000_000_000,
    macAddress: '00:11:22:33:44:55',
    localIp: '192.168.0.31',
    totalDiskBytes: 500_000_000_000,
    freeDiskBytes: 250_000_000_000,
    uptimeSeconds: 3600,
    bootTime: '2026-09-28T11:00:00.000Z',
  },
  cpu: { percentTotal: 30, percentPerCore: [25, 35] },
  memory: {
    totalBytes: 16_000_000_000,
    usedBytes: 8_000_000_000,
    freeBytes: 8_000_000_000,
    usedPercent: 50,
    swapTotalBytes: 0,
    swapUsedBytes: 0,
    swapUsedPercent: 0,
  },
  disks: [],
  diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
  network: [],
  processes: [],
};

/**
 * Uma conexão de mentira, no formato que o `ws` entrega.
 *
 * Guarda os ouvintes para o teste poder mandar mensagem como o agente manda: uma atrás da
 * outra, sem esperar resposta — que é exatamente o que provocava o defeito.
 */
function fakeSocket() {
  const listeners = new Map<string, (payload: never) => void>();
  const sent: string[] = [];
  const closed: { code?: number; reason?: string }[] = [];

  return {
    socket: {
      on: (event: string, listener: (payload: never) => void) => listeners.set(event, listener),
      send: (data: string) => sent.push(data),
      close: (code?: number, reason?: string) => closed.push({ code, reason }),
      ping: () => {},
      terminate: () => closed.push({ reason: 'terminate' }),
    },
    sent,
    closed,
    emit: (raw: string) => listeners.get('message')?.(raw as never),
  };
}

function makeGateway(authenticateDelayMs = 0) {
  const service = {
    authenticateAgent: vi.fn().mockImplementation(async () => {
      /* O token é conferido no BANCO: a resposta não chega no mesmo tique. É essa espera que
         a fila do gateway precisa respeitar. */
      await new Promise((resolve) => setTimeout(resolve, authenticateDelayMs));

      return { ok: true, computer };
    }),
    ingest: vi.fn().mockResolvedValue(undefined),
  };

  const gateway = new AgentGateway(
    service as unknown as ComputersService,
    new AgentPresenceService(),
    new LiveWatchService(),
  );

  return { gateway, service };
}

const hello = JSON.stringify({ type: 'hello', token: 'token', agentVersion: '1.0.0' });
const reading = JSON.stringify({ type: 'snapshot', snapshot });

describe('AgentGateway', () => {
  // feliz
  it('confirms the connection before accepting readings', async () => {
    const { gateway } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    await vi.waitFor(() => expect(client.sent).toHaveLength(1));

    expect(JSON.parse(client.sent[0] ?? '{}')).toMatchObject({ type: 'welcome' });
  });

  /**
   * O defeito que travava a ficha da máquina no painel.
   *
   * O agente manda a apresentação e a primeira leitura em sequência, sem esperar. Conferir o
   * token vai ao banco, e enquanto isso a leitura chegava: a sessão ainda não existia e a
   * conexão caía com "snapshot before hello" — a cada reconexão, para sempre.
   */
  it('keeps a reading that arrives while the token is still being checked', async () => {
    const { gateway, service } = makeGateway(20);
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    client.emit(reading);

    await vi.waitFor(() => expect(service.ingest).toHaveBeenCalledTimes(1));
    expect(client.closed).toHaveLength(0);
  });

  it('handles the readings in the order they arrived', async () => {
    const { gateway, service } = makeGateway(10);
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    client.emit(reading);
    client.emit(reading);

    await vi.waitFor(() => expect(service.ingest).toHaveBeenCalledTimes(2));
  });

  // triste
  it('refuses a reading from a connection that never introduced itself', async () => {
    const { gateway, service } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(reading);

    await vi.waitFor(() => expect(client.closed).toHaveLength(1));
    expect(service.ingest).not.toHaveBeenCalled();
  });

  it('refuses a message it cannot read', async () => {
    const { gateway } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit('isto não é json');

    await vi.waitFor(() => expect(client.closed).toHaveLength(1));
  });
});
