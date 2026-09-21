import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import DonutChart from './donut-chart.svelte';

const slices = [
  { label: 'Em andamento', value: 10 },
  { label: 'Concluído', value: 6 },
];

describe('DonutChart', () => {
  // feliz
  it('draws one arc per slice, each announcing its own value', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByRole('img', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByLabelText('Em andamento: 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Concluído: 6')).toBeInTheDocument();
  });

  /* A legenda escreve o nome: cor sozinha não diz o que é a fatia. */
  it('names every slice in the legend', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  /* A fatia é o caminho para "quais são esses 10", não um enfeite. */
  it('turns the arc into a button and reports which one was clicked', async () => {
    const onSelect = vi.fn();
    render(DonutChart, {
      props: { data: { slices, seriesLabel: 'Status' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Em andamento: 10' }));

    expect(onSelect).toHaveBeenCalledWith('Em andamento');
  });

  // triste
  it('does not turn the arc into a button when there is nowhere to go', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    /* Só o ARCO é verificado: a legenda é montada com `<button>` de qualquer forma, e nisso
       a rosca difere da coluna. */
    expect(screen.queryByRole('button', { name: 'Em andamento: 10' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Em andamento: 10')).toBeInTheDocument();
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
