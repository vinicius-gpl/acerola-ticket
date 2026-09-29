import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AreaChart, { configOf } from './area-chart.svelte';

const series = [
  { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
  { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
];

const points = [
  { at: '2026-09-22T00:00:00.000Z', values: { opened: 4, resolved: 2 } },
  { at: '2026-09-23T00:00:00.000Z', values: { opened: 1, resolved: 5 } },
];

describe('configOf', () => {
  // feliz
  it('carries the name and the colour of every series', () => {
    expect(configOf(series)).toEqual({
      opened: { label: 'Abertos', color: 'var(--chart-1)' },
      resolved: { label: 'Resolvidos', color: 'var(--chart-4)' },
    });
  });

  // triste
  it('has nothing to carry without series (edge case)', () => {
    expect(configOf([])).toEqual({});
  });
});

describe('AreaChart', () => {
  // feliz
  /* Cor sozinha não é informação para quem não distingue cor. */
  it('names every series in writing', () => {
    render(AreaChart, { props: { data: { points, series } } });

    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByText('Resolvidos')).toBeInTheDocument();
  });

  // triste
  it('says there is no reading instead of drawing an empty chart', () => {
    render(AreaChart, { props: { data: { points: [], series } } });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });

  /* Toda leitura com data quebrada é descartada; sobrando nenhuma, o gráfico não desenha um
     quadro vazio — ele diz que não há leitura. */
  it('falls back to the empty message when no reading has a valid instant (edge case)', () => {
    render(AreaChart, {
      props: { data: { points: [{ at: 'ontem', values: { opened: 3 } }], series } },
    });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem leituras": faria a pessoa achar que sumiram. */
  it('says nothing about emptiness while loading (edge case)', () => {
    render(AreaChart, { props: { data: { points: [], series }, state: { isLoading: true } } });

    expect(screen.queryByText('Sem leituras no período.')).not.toBeInTheDocument();
  });
});
