import { z } from 'zod';

import {
  agentCpuSchema,
  agentDiskIoSchema,
  agentDiskSchema,
  agentMemorySchema,
  agentNetworkSchema,
  agentProcessSchema,
} from './agent-snapshot.schema';

/**
 * O CONTRATO da leitura AO VIVO de uma máquina: tudo que o agente enxerga dela, agora.
 *
 * É o que faltava para a ficha responder "abri esta máquina, o que está acontecendo nela?".
 * O resumo guardado em amostras (`computerSampleSchema`) responde "como ela vem passando" — é
 * outra pergunta, com outra forma: três números por leitura, para virar gráfico de horas.
 * Aqui é o oposto: MUITO detalhe de UM instante, e nenhum histórico.
 *
 * Os pedaços são os MESMOS do que o agente envia (`agent-snapshot.schema`), reaproveitados em
 * vez de redigitados: um campo a mais no agente aparece aqui sem ninguém lembrar de copiar.
 * O que NÃO é reaproveitado é o `host`: aqueles fatos já vivem em colunas da ficha, e mandá-los
 * de novo aqui criaria duas verdades sobre a mesma máquina na mesma tela.
 */

export const computerLiveSchema = z.object({
  computerId: z.number().int(),
  /**
   * Quando o agente MEDIU — o relógio da máquina dele.
   *
   * Separado de `receivedAt` de propósito: máquina com o relógio errado é comum, e é a
   * diferença entre os dois que denuncia isso em vez de fazer a tela mentir sozinha.
   */
  measuredAt: z.string().datetime({ offset: true }),
  /** Quando o servidor recebeu. É por este que a tela diz "há quanto tempo". */
  receivedAt: z.string().datetime(),
  /** Se a conexão do agente está aberta agora: sem ela, o que está aqui é o último retrato. */
  isOnline: z.boolean(),

  cpu: agentCpuSchema,
  memory: agentMemorySchema,
  disks: z.array(agentDiskSchema),
  diskIo: agentDiskIoSchema,
  network: z.array(agentNetworkSchema),
  /** Os aplicativos que mais pesam, do maior para o menor. */
  processes: z.array(agentProcessSchema),
});

export type ComputerLive = z.infer<typeof computerLiveSchema>;

/**
 * A resposta quando a máquina NUNCA enviou nada.
 *
 * Nulo, e não um objeto zerado: zero em toda medida é indistinguível de uma máquina ligada e
 * ociosa, e a tela precisa dizer "o agente ainda não conectou aqui" — que é outra conversa,
 * com outro botão.
 */
export const computerLiveResponseSchema = z.object({
  live: computerLiveSchema.nullable(),
});

export type ComputerLiveResponse = z.infer<typeof computerLiveResponseSchema>;
