import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import DonutChart, { configOf, percentOf } from './donut-chart.svelte';

const slices = [
  { label: 'Em andamento', value: 10 },
  { label: 'Concluído', value: 6 },
];

describe('percentOf', () => {
  // feliz
  it('answers the whole percentage of the slice', () => {
    expect(percentOf(10, 40)).toBe(25);
  });

  // triste
  /* Total zero é a rosca recém-aberta, não uma divisão por zero na tela. */
  it('answers zero when there is no total (edge case)', () => {
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe('configOf', () => {
  // feliz
  it('names every slice for the tooltip', () => {
    expect(configOf(slices)).toEqual({
      'Em andamento': { label: 'Em andamento' },
      Concluído: { label: 'Concluído' },
    });
  });
});

describe('DonutChart', () => {
  // feliz
  /* A legenda escreve o nome: cor sozinha não diz o que é a fatia. */
  it('names every slice in the legend, with value and percentage', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByRole('img', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  /* O total no meio do anel poupa a soma de cabeça. */
  it('sums the slices in the middle of the ring', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByText('16')).toBeInTheDocument();
  });

  /* A fatia é o caminho para "quais são esses 10", não um enfeite. */
  it('turns the legend into a button and reports which slice was chosen', async () => {
    const onSelect = vi.fn();
    render(DonutChart, {
      props: { data: { slices, seriesLabel: 'Status' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: /Em andamento/ }));

    expect(onSelect).toHaveBeenCalledWith('Em andamento');
  });

  // triste
  it('does not turn the legend into a button when there is nowhere to go', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('says there is nothing instead of drawing an empty ring (edge case)', () => {
    render(DonutChart, {
      props: {
        data: { slices: [], seriesLabel: 'Status' },
        ui: { emptyLabel: 'Nenhum cliente neste filtro' },
      },
    });

    expect(screen.getByText('Nenhum cliente neste filtro')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows neither the ring nor the empty message while loading (edge case)', () => {
    render(DonutChart, {
      props: { data: { slices: [], seriesLabel: 'Status' }, state: { isLoading: true } },
    });

    expect(screen.queryByText('Sem dados para mostrar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
