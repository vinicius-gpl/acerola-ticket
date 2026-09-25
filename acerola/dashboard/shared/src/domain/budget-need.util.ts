/**
 * AS NECESSIDADES DO ORÇAMENTO: o que o parque pede, e de qual prateleira isso sai.
 *
 * Três necessidades, e só três, porque só há três medidas confiáveis para sustentá-las:
 * memória total, espaço livre em disco e número de manutenções. As réguas são as MESMAS da
 * tela de Inteligência (`insight-rules.util`) — duas telas contando a mesma coisa com réguas
 * diferentes é como a equipe passa a discutir qual delas está certa.
 */

import { type PartCategory } from './part-catalog.util';

export const BUDGET_NEEDS = ['memory', 'disk', 'computer'] as const;

export type BudgetNeedKey = (typeof BUDGET_NEEDS)[number];

/**
 * De qual prateleira sai cada necessidade.
 *
 * É este mapa que permite o desconto: sem ele, a tela mandaria comprar memória com oito
 * pentes parados no depósito. O casamento é por CATEGORIA da peça, e não pelo nome — o
 * sistema antigo comparava texto ("Memória 8GB" com "memoria 8 gb") e errava na acentuação.
 */
export const BUDGET_NEED_CATEGORY: Record<BudgetNeedKey, PartCategory> = {
  memory: 'memory',
  disk: 'ssd',
  computer: 'desktop',
};

export const BUDGET_NEED_LABELS: Record<BudgetNeedKey, string> = {
  memory: 'Memória',
  disk: 'Disco (SSD)',
  computer: 'Máquina para substituir',
};

/** Por que cada máquina entrou na conta — a régua, em português, ao lado do número. */
export const BUDGET_NEED_HINTS: Record<BudgetNeedKey, string> = {
  memory: 'Máquinas com menos de 8 GB de memória.',
  disk: 'Máquinas com menos de 15% livre no disco.',
  computer: 'Máquinas com 3 manutenções ou mais — remendar sai mais caro do que trocar.',
};

/** A unidade do número que colocou cada máquina na lista. */
export const BUDGET_NEED_UNITS: Record<BudgetNeedKey, string> = {
  memory: 'GB de memória',
  disk: '% livre',
  computer: 'manutenções',
};

export function budgetNeedLabel(key: BudgetNeedKey): string {
  return BUDGET_NEED_LABELS[key];
}

export function budgetNeedHint(key: BudgetNeedKey): string {
  return BUDGET_NEED_HINTS[key];
}

export function budgetNeedUnit(key: BudgetNeedKey): string {
  return BUDGET_NEED_UNITS[key];
}

/**
 * Quantas comprar: o que falta, nunca negativo.
 *
 * Sobra de depósito NÃO vira crédito: dez teclados parados não pagam um pente de memória, e
 * um "-6" numa lista de compras só faz quem lê parar para interpretar.
 */
export function toBuyOf(needed: number, inStock: number): number {
  return Math.max(0, needed - inStock);
}

/**
 * Se esta necessidade ainda pede compra.
 *
 * Necessidade coberta pelo depósito continua NA TELA, com o número zerado — sumir com ela
 * esconderia justamente a boa notícia ("12 precisam, e o depósito cobre todas").
 */
export function needsPurchase(needed: number, inStock: number): boolean {
  return toBuyOf(needed, inStock) > 0;
}
