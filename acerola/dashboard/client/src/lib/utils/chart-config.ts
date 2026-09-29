import { getContext, setContext } from 'svelte';

/**
 * O CONTRATO DE UM GRÁFICO: o rótulo e a cor de cada série, num lugar só.
 *
 * É o mesmo formato do gráfico do shadcn-svelte, de propósito — a moldura (`ChartFrame`) o
 * transforma em variáveis CSS (`--color-<chave>`) e o balão (`ChartTooltip`) lê dele o nome
 * que a pessoa vê. Sem esse contrato, cada gráfico escolheria o próprio jeito de dizer
 * "memória é azul", e a mesma série mudaria de cor de tela para tela.
 */
export type ChartSeriesConfig = { label: string; color?: string };

export type ChartConfig = Record<string, ChartSeriesConfig>;

const CHART_CONTEXT_KEY = Symbol('chart-config');

type ChartContext = { readonly config: ChartConfig };

/** A moldura publica o contrato; o balão o encontra sem receber prop nenhuma. */
export function setChartConfigContext(context: ChartContext): void {
  setContext(CHART_CONTEXT_KEY, context);
}

/**
 * O contrato do gráfico em volta — vazio quando o balão é usado fora de uma moldura.
 *
 * Vazio em vez de erro: um balão sem contrato mostra a chave crua em vez do rótulo, o que é
 * feio mas legível; derrubar a tela inteira por causa de um balão, não.
 */
export function getChartConfigContext(): ChartContext {
  return getContext<ChartContext | undefined>(CHART_CONTEXT_KEY) ?? { config: {} };
}

/** As regras CSS que dão a cor de cada série ao gráfico de um `id`. */
export function chartStyleOf(id: string, config: ChartConfig): string | null {
  const declarations = Object.entries(config)
    .filter(([, series]) => series.color)
    .map(([key, series]) => `--color-${key}: ${series.color};`);

  if (declarations.length === 0) return null;

  return `[data-chart=${id}] {\n${declarations.join('\n')}\n}`;
}
