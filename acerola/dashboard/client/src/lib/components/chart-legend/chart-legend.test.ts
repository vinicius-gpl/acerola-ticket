import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ChartLegend from './chart-legend.svelte';

describe('ChartLegend', () => {
  // feliz
  /* O nome escrito ao lado da cor: cor sozinha não é informação para quem não distingue cor. */
  it('writes the name of every series', () => {
    render(ChartLegend, {
      props: {
        data: {
          series: [
            { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
            { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
          ],
        },
      },
    });

    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByText('Resolvidos')).toBeInTheDocument();
  });

  // triste
  it('shows an empty list when there is no series (edge case)', () => {
    render(ChartLegend, { props: { data: { series: [] } } });

    expect(screen.getByRole('list').children).toHaveLength(0);
  });
});
