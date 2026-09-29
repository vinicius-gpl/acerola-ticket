/**
 * O QUE ALIMENTA OS GRÁFICOS DE TEMPO — área e linha.
 *
 * Fica fora dos componentes porque os dois desenham a mesma coisa de formas diferentes, e
 * porque contas de gráfico erradas desenham um gráfico bonito que mente — o pior defeito
 * possível numa tela de diagnóstico. Aqui elas têm teste próprio.
 */

/** Uma série: a chave é do contrato (inglês), o rótulo é o que a pessoa lê (português). */
export type TimeSeriesDef = { key: string; label: string; color: string };

/** Uma leitura: o instante em ISO e o valor de cada série naquele instante. */
export type TimePoint = { at: string; values: Record<string, number> };

/** A mesma leitura já achatada, como a biblioteca de gráfico lê. */
export type TimeRow = { at: Date } & Record<string, number | Date>;

/**
 * Converte as leituras para o gráfico, DESCARTANDO o que não tem data válida.
 *
 * Uma data inválida virando `Invalid Date` no eixo do tempo quebra a escala inteira, e o
 * gráfico some da tela sem dizer por quê.
 */
export function toTimeRows(
  points: readonly TimePoint[],
  series: readonly TimeSeriesDef[],
): TimeRow[] {
  return points
    .map((point) => buildRow(point, series))
    .filter((row): row is TimeRow => row !== null);
}

function buildRow(point: TimePoint, series: readonly TimeSeriesDef[]): TimeRow | null {
  const at = new Date(point.at);
  if (Number.isNaN(at.getTime())) return null;

  const row: TimeRow = { at };

  /* Série sem valor na leitura vira zero, e não buraco: buraco na linha se lê como "o agente
     estava fora do ar", que é outra coisa. */
  for (const item of series) {
    row[item.key] = point.values[item.key] ?? 0;
  }

  return row;
}

/** A hora de uma leitura, curta: o eixo quer "14h", não "23/09/2026 14:05". */
export function hourLabel(value: Date | string): string {
  const date = asDate(value);
  if (!date) return '—';

  return `${String(date.getHours()).padStart(2, '0')}h`;
}

/** O dia de uma leitura, curto: o eixo quer "23/09", não a data inteira. */
export function dayLabel(value: Date | string): string {
  const date = asDate(value);
  if (!date) return '—';

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function asDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
