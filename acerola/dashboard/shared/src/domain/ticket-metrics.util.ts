import { isClosedTicketStatus, type TicketStatus } from './ticket-status.util';

/**
 * Os indicadores do painel, calculados a partir da lista de chamados.
 *
 * São funções puras, sem banco e sem data "de agora" escondida: recebem o que precisam e
 * devolvem número. É o que permite testá-los sem subir nada e o que impede um indicador de
 * mudar de valor só porque o teste rodou depois da meia-noite.
 *
 * O tipo de entrada é o mínimo necessário, declarado aqui — o domínio não conhece o contrato
 * da API, senão o cálculo passaria a depender do formato de transporte.
 */
export type TicketMetricsInput = {
  status: TicketStatus;
  createdAt: string;
  resolvedAt: string | null;
};

const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;

export type TicketSummary = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  cancelled: number;
  averageResolutionHours: number | null;
};

/**
 * Quanto tempo, em horas, levou entre abrir e resolver.
 *
 * Só conta chamado que tem as duas pontas. Um chamado ainda aberto não entra no cálculo com
 * "o tempo até agora": isso faria a média piorar sozinha a cada hora do dia, sem ninguém
 * ter feito nada.
 */
export function resolutionHours(ticket: TicketMetricsInput): number | null {
  if (!ticket.resolvedAt) return null;

  const opened = Date.parse(ticket.createdAt);
  const resolved = Date.parse(ticket.resolvedAt);
  if (Number.isNaN(opened) || Number.isNaN(resolved)) return null;

  /* Resolvido antes de aberto é dado inconsistente (fuso trocado, importação torta). Entrar
     na média como número negativo puxaria o indicador para baixo sem ninguém perceber. */
  if (resolved < opened) return null;

  return (resolved - opened) / MILLISECONDS_PER_HOUR;
}

/**
 * A média de resolução. Nulo quando ainda não há chamado resolvido — e nulo NÃO é zero:
 * "0 h" faria o painel anunciar atendimento instantâneo num sistema que nunca resolveu nada.
 */
export function averageResolutionHours(tickets: readonly TicketMetricsInput[]): number | null {
  const durations = tickets.map(resolutionHours).filter((hours) => hours !== null);
  if (durations.length === 0) return null;

  const total = durations.reduce((sum, hours) => sum + hours, 0);

  return total / durations.length;
}

export function summarizeTickets(tickets: readonly TicketMetricsInput[]): TicketSummary {
  const countOf = (status: TicketStatus) => tickets.filter((t) => t.status === status).length;

  return {
    total: tickets.length,
    open: countOf('open'),
    inProgress: countOf('in_progress'),
    resolved: countOf('resolved'),
    cancelled: countOf('cancelled'),
    averageResolutionHours: averageResolutionHours(tickets),
  };
}

/** Quantos chamados ainda pedem trabalho do TI — o número que a fila mostra. */
export function countPendingTickets(tickets: readonly TicketMetricsInput[]): number {
  return tickets.filter((ticket) => !isClosedTicketStatus(ticket.status)).length;
}

/**
 * Agrupa e conta por um campo (tipo de problema, departamento), da maior para a menor.
 *
 * Ordenado aqui, e não na tela, porque "os que mais aparecem" é a pergunta — se cada tela
 * ordenar por conta própria, o mesmo gráfico sai em ordens diferentes.
 */
export function countByField<TItem, TKey extends string>(
  items: readonly TItem[],
  pick: (item: TItem) => TKey,
): { key: TKey; count: number }[] {
  const counts = new Map<TKey, number>();

  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
