import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ColumnChart from './column-chart.svelte';

const slices = [
  { label: 'Ana', value: 12 },
  { label: 'Bia', value: 9 },
];

describe('ColumnChart', () => {
  // feliz
  it('draws one column per slice, each announcing its own value', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Tarefas' } } });

    expect(screen.getByRole('img', { name: 'Tarefas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Bia: 9')).toBeInTheDocument();
  });

  /* O valor em cima da coluna existe para ninguém precisar estimar pela altura. */
  it('writes the value above each column', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Tarefas' } } });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  /* O gráfico é o caminho para a lista filtrada, não um enfeite. */
  it('turns the column into a button and reports which one was clicked', async () => {
    const onSelect = vi.fn();
    render(ColumnChart, {
      props: { data: { slices, seriesLabel: 'Tarefas' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Ana: 12' }));

    expect(onSelect).toHaveBeenCalledWith('Ana');
  });

  // triste
  it('is not clickable when there is nowhere to go', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Tarefas' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /* Nada a mostrar não é um gráfico vazio: é uma frase dizendo isso. */
  it('says there is nothing instead of drawing an empty chart (edge case)', () => {
    render(ColumnChart, {
      props: {
        data: { slices: [], seriesLabel: 'Tarefas' },
        ui: { emptyLabel: 'Nenhuma tarefa ainda' },
      },
    });

    expect(screen.getByText('Nenhuma tarefa ainda')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem dados": faria a pessoa achar que sumiram. */
  it('shows neither the chart nor the empty message while loading (edge case)', () => {
    render(ColumnChart, {
      props: { data: { slices: [], seriesLabel: 'Tarefas' }, state: { isLoading: true } },
    });

    expect(screen.queryByText('Sem dados para mostrar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
