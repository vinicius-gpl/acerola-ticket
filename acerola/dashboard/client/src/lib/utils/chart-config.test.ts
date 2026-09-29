import { describe, expect, it } from 'vitest';

import { chartStyleOf, type ChartConfig } from './chart-config';

const config: ChartConfig = {
  opened: { label: 'Abertos', color: 'var(--chart-1)' },
  resolved: { label: 'Resolvidos', color: 'var(--chart-4)' },
};

describe('chartStyleOf', () => {
  // feliz
  /* É por estas variáveis que o desenho e o balão pegam a cor da série. Errar a chave aqui
     é o gráfico inteiro sair cinza. */
  it('turns every series colour into a variable tied to this chart', () => {
    const style = chartStyleOf('chart-abc', config);

    expect(style).toContain('[data-chart=chart-abc]');
    expect(style).toContain('--color-opened: var(--chart-1);');
    expect(style).toContain('--color-resolved: var(--chart-4);');
  });

  // triste
  /* Sem cor não há regra: uma folha de estilo vazia no meio da página é lixo. */
  it('writes no rule when no series has a colour', () => {
    expect(chartStyleOf('chart-abc', { opened: { label: 'Abertos' } })).toBeNull();
  });

  it('writes no rule for an empty contract (edge case)', () => {
    expect(chartStyleOf('chart-abc', {})).toBeNull();
  });
});
