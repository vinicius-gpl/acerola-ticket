import { computeHealth } from '@template/shared/domain/computer-health.util';
import {
  type AgentSnapshot,
  type AgentInventory,
} from '@template/shared/schemas/agent-snapshot.schema';
import {
  type Computer,
  type CreateComputerInput,
  type ComputerSample,
  type UpdateComputerInput,
} from '@template/shared/schemas/computer.schema';

import { mapDefined, setIfDefined } from '../../../lib/db/partial-update.util';
import {
  type ComputerSampleInsert,
} from '../../../lib/db/schema/computer-samples.schema';
import { type ComputerInsert, type ComputerRow } from '../../../lib/db/schema/computers.schema';

/**
 * A tradução entre a linha do banco e o contrato.
 *
 * `isOnline` entra por PARÂMETRO, e não sai da linha: estar online é ter uma conexão aberta
 * agora, e quem sabe disso é o registro de conexões vivas, não o banco.
 */
export function toComputer(row: ComputerRow, isOnline: boolean): Computer {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    responsibleName: row.responsibleName,
    department: row.department,

    hardware: {
      os: row.os,
      platform: row.platform,
      platformVersion: row.platformVersion,
      kernelVersion: row.kernelVersion,
      arch: row.arch,
      cpuModel: row.cpuModel,
      logicalCpus: row.logicalCpus,
      physicalCpus: row.physicalCpus,
      totalMemoryBytes: row.totalMemoryBytes,
      macAddress: row.macAddress,
      localIp: row.localIp,
      totalDiskBytes: row.totalDiskBytes,
      freeDiskBytes: row.freeDiskBytes,
      uptimeSeconds: row.uptimeSeconds,
      bootTime: row.bootTime?.toISOString() ?? null,
    },

    healthScore: row.healthScore,
    healthStatus: row.healthStatus,
    warnings: Array.isArray(row.warnings) ? (row.warnings as Computer['warnings']) : [],

    isOnline,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    agentVersion: row.agentVersion,

    isArchived: row.isArchived,
    isBlocked: row.isBlocked,
    blockReason: row.blockReason,

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/**
 * O cadastro inicial. Nada de hardware: ele chega medido, na primeira conexão do agente.
 *
 * O hash do token vem de quem o sorteou — o mapper nunca vê o token legível, e por isso não
 * há caminho por onde ele possa escapar para um log daqui.
 */
export function toComputerInsert(
  input: CreateComputerInput,
  tokenHash: string,
  actorEmail: string,
): ComputerInsert {
  return {
    name: input.name.trim(),
    displayName: normalizeOptional(input.displayName) ?? null,
    responsibleName: normalizeOptional(input.responsibleName) ?? null,
    department: input.department ?? null,
    tokenHash,
    createdBy: actorEmail,
  };
}

/** O que o TI altera: identificação e situação. Hardware não se digita. */
export function toComputerUpdate(
  input: UpdateComputerInput,
  actorEmail: string,
  now: Date = new Date(),
): Partial<ComputerInsert> {
  const update: Partial<ComputerInsert> = { updatedAt: now, updatedBy: actorEmail };

  setIfDefined(update, 'displayName', normalizeOptional(input.displayName));
  setIfDefined(update, 'responsibleName', normalizeOptional(input.responsibleName));
  setIfDefined(update, 'department', input.department);
  setIfDefined(update, 'isArchived', input.isArchived);
  setIfDefined(update, 'isBlocked', input.isBlocked);
  setIfDefined(update, 'blockReason', normalizeOptional(input.blockReason));

  /* Desbloquear limpa o motivo: deixá-lo faria a ficha acusar um bloqueio que não existe. */
  if (input.isBlocked === false) update.blockReason = null;

  return update;
}

/**
 * O que uma leitura do agente muda na ficha da máquina.
 *
 * A nota de saúde é RECALCULADA aqui, a cada envio, e não guardada pelo agente: a régua é
 * decisão do servidor. Foi o que permitiu tirá-la do script que rodava em cada máquina —
 * mudar o critério agora não exige reinstalar nada em lugar nenhum.
 */
export function toSnapshotUpdate(
  snapshot: AgentSnapshot,
  agentVersion: string,
  now: Date = new Date(),
): Partial<ComputerInsert> {
  const host = snapshot.host;
  const health = computeHealth({
    totalMemoryBytes: host.totalMemoryBytes,
    totalDiskBytes: host.totalDiskBytes,
    freeDiskBytes: host.freeDiskBytes,
    uptimeSeconds: host.uptimeSeconds,
  });

  return {
    ...hardwareOf(host),
    lastSnapshot: snapshot,
    healthScore: health.score,
    healthStatus: health.status,
    warnings: health.warnings,
    lastSeenAt: now,
    agentVersion,
  };
}

function hardwareOf(host: AgentInventory): Partial<ComputerInsert> {
  return {
    os: host.os,
    platform: host.platform,
    platformVersion: host.platformVersion,
    kernelVersion: host.kernelVersion,
    arch: host.arch,
    cpuModel: host.cpuModel,
    logicalCpus: host.logicalCpus,
    physicalCpus: host.physicalCpus,
    totalMemoryBytes: host.totalMemoryBytes,
    macAddress: host.macAddress,
    localIp: host.localIp,
    totalDiskBytes: host.totalDiskBytes,
    freeDiskBytes: host.freeDiskBytes,
    uptimeSeconds: host.uptimeSeconds,
    bootTime: new Date(host.bootTime),
  };
}

/**
 * A linha enxuta da série de uso: quatro números e o instante.
 *
 * O disco é o percentual OCUPADO do conjunto de discos locais — é o número que responde "está
 * enchendo?". A rede é a soma das interfaces ativas, porque numa máquina com Wi-Fi e cabo o
 * que interessa é quanto tráfego ela fez, não por onde.
 */
export function toSample(computerId: number, snapshot: AgentSnapshot): ComputerSampleInsert {
  const host = snapshot.host;

  return {
    computerId,
    sampledAt: new Date(snapshot.timestamp),
    cpuPercent: snapshot.cpu.percentTotal,
    memoryPercent: snapshot.memory.usedPercent,
    diskPercent: diskUsedPercent(host),
    networkBytesPerSec: snapshot.network.reduce(
      (total, iface) => total + iface.bytesSentPerSec + iface.bytesRecvPerSec,
      0,
    ),
  };
}

function diskUsedPercent(host: AgentInventory): number {
  if (!host.totalDiskBytes) return 0;

  return ((host.totalDiskBytes - host.freeDiskBytes) / host.totalDiskBytes) * 100;
}

/** A amostra como a tela a recebe. */
export function toComputerSample(row: {
  sampledAt: Date;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkBytesPerSec: number;
}): ComputerSample {
  return {
    sampledAt: row.sampledAt.toISOString(),
    cpuPercent: row.cpuPercent,
    memoryPercent: row.memoryPercent,
    diskPercent: row.diskPercent,
    networkBytesPerSec: row.networkBytesPerSec,
  };
}

function normalizeOptional(value: string | null | undefined): string | null | undefined {
  return mapDefined(value, (text) => text.trim() || null);
}
