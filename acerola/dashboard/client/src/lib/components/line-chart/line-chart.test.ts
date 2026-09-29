import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import LineChart, { configOf } from './line-chart.svelte';

const series = [
  { key: 'cpu', label: 'Processador', color: 'var(--chart-1)' },
  { key: 'memory', label: 'Memória', color: 'var(--chart-4)' },
];

const points = [
  { at: '2026-09-23T10:00:00.000Z', values: { cpu: 30, memory: 60 } },
  { at: '2026-09-23T11:00:00.000Z', values: { cpu: 70, memory: 65 } },
];

describe('configOf', () => {
  // feliz
  it('carries the name and the colour of every series', () => {
    expect(configOf(series).cpu).toEqual({ label: 'Processador', color: 'var(--chart-1)' });
  });

  // triste
  it('has nothing to carry without series (edge case)', () => {
    expect(configOf([])).toEqual({});
  });
});

describe('LineChart', () => {
  // feliz
  /* Cor sozinha não é informação para quem não distingue cor. */
  it('names every series in writing', () => {
    render(LineChart, { props: { data: { points, series } } });

    expect(screen.getByText('Processador')).toBeInTheDocument();
    expect(screen.getByText('Memória')).toBeInTheDocument();
  });

  // triste
  it('says there is no reading instead of drawing an empty chart', () => {
    render(LineChart, { props: { data: { points: [], series } } });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem leituras": faria a pessoa achar que sumiram. */
  it('says nothing about emptiness while loading (edge case)', () => {
    render(LineChart, { props: { data: { points: [], series }, state: { isLoading: true } } });

    expect(screen.queryByText('Sem leituras no período.')).not.toBeInTheDocument();
  });
});
