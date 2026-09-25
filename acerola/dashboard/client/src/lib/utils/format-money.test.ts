import { describe, expect, it } from 'vitest';

import { formatMoney, formatMoneyRange } from './format-money';

/* O espaço do "R$" que o Intl usa não é o espaço comum — comparar por igualdade exata
   quebraria o teste em outra versão do Node sem nada ter mudado na tela. */
function normalize(value: string): string {
  return value.replace(/\s/g, ' ');
}

describe('formatMoney', () => {
  // feliz
  it('reads a value in reais, without cents', () => {
    expect(normalize(formatMoney(1840))).toBe('R$ 1.840');
  });

  it('rounds away the cents of an estimate', () => {
    expect(normalize(formatMoney(229.9))).toBe('R$ 230');
  });

  // triste
  /* Nulo é "não sei", e traço é como o resto do sistema diz isso. "R$ 0" seria uma
     afirmação: a de que a compra não custa nada. */
  it('shows a dash when there is no value', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });
});

describe('formatMoneyRange', () => {
  // feliz
  it('reads the range in one sentence', () => {
    expect(normalize(formatMoneyRange(920, 1720))).toBe('R$ 920 a R$ 1.720');
  });
});
