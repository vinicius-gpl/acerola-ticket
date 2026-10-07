import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ChartFrameHarness from './acerola-chart-frame-harness.test.svelte';

describe('AcerolaChartFrame', () => {
  // feliz
  it('draws what it was given', () => {
    render(ChartFrameHarness, {
      props: { config: { opened: { label: 'Abertos', color: 'var(--chart-1)' } } },
    });

    expect(screen.getByTestId('desenho')).toBeInTheDocument();
  });

  /* É por estas variáveis que o desenho e o balão pegam a cor da série — e elas precisam
     valer só para ESTE gráfico, senão dois gráficos na mesma página trocam de paleta. */
  it('publishes the colour of every series tied to this chart alone', () => {
    const { container } = render(ChartFrameHarness, {
      props: { config: { opened: { label: 'Abertos', color: 'var(--chart-1)' } } },
    });

    const frame = container.querySelector('[data-slot="chart"]');
    const style = container.querySelector('style');

    expect(style?.textContent).toContain('--color-opened: var(--chart-1);');
    expect(style?.textContent).toContain(`[data-chart=${frame?.getAttribute('data-chart')}]`);
  });

  // triste
  /* Contrato sem cor não gera folha de estilo: uma regra vazia no meio da página é lixo. */
  it('writes no style sheet when no series has a colour', () => {
    const { container } = render(ChartFrameHarness, {
      props: { config: { opened: { label: 'Abertos' } } },
    });

    expect(container.querySelector('style')).toBeNull();
    expect(screen.getByTestId('desenho')).toBeInTheDocument();
  });
});
