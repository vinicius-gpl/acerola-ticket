/**
 * Dinheiro para a TELA, sempre em real e no formato de quem lê ("R$ 1.840").
 *
 * **Sem centavos, de propósito.** Todo valor que passa por aqui é estimativa de compra, e
 * "R$ 1.840,00" tem cara de cotação fechada — o centavo dá a uma faixa de pesquisa uma
 * precisão que ela não tem.
 */
const MONEY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  return MONEY.format(Math.round(value));
}

/** Uma faixa de preço em uma frase: "R$ 920 a R$ 1.720". */
export function formatMoneyRange(min: number, max: number): string {
  return `${formatMoney(min)} a ${formatMoney(max)}`;
}
