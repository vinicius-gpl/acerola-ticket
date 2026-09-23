import { z } from 'zod';

/**
 * O QUE O AGENTE ENVIA — o contrato de fronteira entre o agente em Go e o dashboard.
 *
 * Este schema é a cópia fiel da `metrics.Snapshot` do agente (`src-go/metrics/types.go`),
 * campo por campo, com os mesmos nomes das tags `json` de lá. Isso é de propósito: o agente
 * não remodela nada para falar com o servidor — ele manda o que já monta para a própria tela
 * dele. Qualquer tradução no meio seria mais um lugar para os dois lados discordarem.
 *
 * As mensagens aqui NÃO são texto de tela: quem lê é o agente, num log. Por isso ficam em
 * inglês, ao contrário do resto dos schemas (CONTRIBUTING §1).
 *
 * Tudo que é número vem de contador do sistema operacional: `nonnegative` recusa um valor
 * impossível antes de ele virar gráfico. Campo novo no agente entra aqui na mesma mudança.
 */

const percent = z.number().min(0).max(100);
const bytes = z.number().nonnegative();
const bytesPerSecond = z.number().nonnegative();

/** Os fatos da máquina: mudam raramente. É o que vira a ficha do computador. */
export const agentInventorySchema = z.object({
  hostname: z.string().min(1),
  os: z.string(),
  platform: z.string(),
  platformVersion: z.string(),
  kernelVersion: z.string(),
  arch: z.string(),
  cpuModel: z.string(),
  logicalCpus: z.number().int().nonnegative(),
  physicalCpus: z.number().int().nonnegative(),
  totalMemoryBytes: bytes,
  macAddress: z.string(),
  localIp: z.string(),
  totalDiskBytes: bytes,
  freeDiskBytes: bytes,
  uptimeSeconds: z.number().nonnegative(),
  bootTime: z.string().datetime({ offset: true }),
});

export type AgentInventory = z.infer<typeof agentInventorySchema>;

export const agentCpuSchema = z.object({
  percentTotal: percent,
  percentPerCore: z.array(percent),
});

export const agentMemorySchema = z.object({
  totalBytes: bytes,
  usedBytes: bytes,
  freeBytes: bytes,
  usedPercent: percent,
  swapTotalBytes: bytes,
  swapUsedBytes: bytes,
  swapUsedPercent: percent,
});

export const agentDiskSchema = z.object({
  mountpoint: z.string(),
  fstype: z.string(),
  totalBytes: bytes,
  usedBytes: bytes,
  freeBytes: bytes,
  usedPercent: percent,
});

export const agentDiskIoSchema = z.object({
  readBytesPerSec: bytesPerSecond,
  writeBytesPerSec: bytesPerSecond,
});

export const agentNetworkSchema = z.object({
  name: z.string(),
  bytesSentPerSec: bytesPerSecond,
  bytesRecvPerSec: bytesPerSecond,
});

const agentProcessInstanceSchema = z.object({
  pid: z.number().int(),
  cpuPercent: z.number().nonnegative(),
  memPercent: z.number().nonnegative(),
  memBytes: bytes,
});

/**
 * Um APLICATIVO, não um processo: o agente já soma todos os processos do mesmo executável.
 *
 * O Chrome abre um processo por aba, extensão e GPU; listado processo a processo, o maior
 * pedaço aparecia com 400 MB enquanto o total passava de 2,6 GB — a tela mentia justamente
 * sobre o programa que mais pesa. `cpuPercent` pode passar de 100 porque é a soma de vários
 * núcleos, e por isso não usa a régua de porcentagem.
 */
export const agentProcessSchema = z.object({
  name: z.string(),
  instanceCount: z.number().int().nonnegative(),
  cpuPercent: z.number().nonnegative(),
  memPercent: z.number().nonnegative(),
  memBytes: bytes,
  instances: z.array(agentProcessInstanceSchema).default([]),
});

export const agentSnapshotSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  host: agentInventorySchema,
  cpu: agentCpuSchema,
  memory: agentMemorySchema,
  disks: z.array(agentDiskSchema).default([]),
  diskIo: agentDiskIoSchema,
  network: z.array(agentNetworkSchema).default([]),
  processes: z.array(agentProcessSchema).default([]),
});

export type AgentSnapshot = z.infer<typeof agentSnapshotSchema>;

/**
 * A primeira mensagem da conexão: o agente diz qual máquina é e prova com o token.
 *
 * O token NÃO vai na URL, e sim no corpo da mensagem: endereço de WebSocket aparece em log de
 * proxy e no histórico do navegador, e um token em log é um token vazado.
 */
export const agentHelloSchema = z.object({
  type: z.literal('hello'),
  token: z.string().min(1),
  agentVersion: z.string().default('desconhecida'),
});

export type AgentHello = z.infer<typeof agentHelloSchema>;

/** Cada leitura periódica, depois que a conexão foi aceita. */
export const agentSnapshotMessageSchema = z.object({
  type: z.literal('snapshot'),
  snapshot: agentSnapshotSchema,
});

/**
 * Tudo que o agente pode mandar. O `type` é o que separa uma coisa da outra — sem ele, o
 * servidor teria que adivinhar pela forma, e adivinhar em fronteira de rede é como um campo
 * novo vira erro silencioso.
 */
export const agentMessageSchema = z.discriminatedUnion('type', [
  agentHelloSchema,
  agentSnapshotMessageSchema,
]);

export type AgentMessage = z.infer<typeof agentMessageSchema>;
