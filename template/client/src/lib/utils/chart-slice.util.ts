/**
 * AS CORES DE CATEGORIA DOS GRÁFICOS.
 *
 * Categoria com cor fixa (a situação de uma tarefa, por exemplo) fica no mapa: "verde é
 * concluída" precisa valer em todo gráfico do sistema. O que não está no mapa cai na lista de
 * reserva, NA ORDEM, nunca sorteada — sorteio faria a mesma fatia mudar de cor a cada
 * recarga.
 *
 * **Aviso registrado, de propósito.** Nenhuma paleta categórica com muitas fatias passa no
 * teste de daltonismo. Por isso cada gráfico aqui carrega SEMPRE legenda com o nome escrito,
 * valor desenhado e tooltip — a cor nunca é o único jeito de saber qual fatia é qual.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Concluída: '#10b981',
  'Em andamento': '#3b82f6',
  'A fazer': '#9ca3af',
};

/** A lista de reserva, na ordem — percorrida, nunca sorteada. */
export const FALLBACK_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

export type ChartSlice = { label: string; value: number };

/** A cor de uma fatia: o mapa de categorias manda; sem ele, a posição na lista de reserva. */
export function colorOfSlice(label: string, index: number): string {
  return CATEGORY_COLORS[label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
}

/**
 * Contagem por chave, do maior para o menor.
 *
 * Valor ausente vira "N/A" em vez de desaparecer: fatia que não existe esconde que há
 * registro sem o campo preenchido, e é justamente isso que alguém precisa ver para corrigir.
 */
export function countBy<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string | null,
): ChartSlice[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const label = read(row) ?? 'N/A';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
