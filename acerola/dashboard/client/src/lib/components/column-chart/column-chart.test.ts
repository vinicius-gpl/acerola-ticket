import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ColumnChart, { configOf, shorten } from './column-chart.svelte';

const slices = [
  { label: 'Ana', value: 12 },
  { label: 'Bia', value: 9 },
];

describe('shorten', () => {
  // feliz
  it('leaves a short label alone', () => {
    expect(shorten('Ana')).toBe('Ana');
  });

  /* Cortar no lugar errado é como "CONTABIL-01" e "CONTABIL-02" viram duas barras com o
     mesmo nome na tela. */
  it('cuts a long label and marks that it was cut', () => {
    expect(shorten('Departamento Financeiro')).toBe('Departamento…');
    expect(shorten('Departamento Financeiro')).toHaveLength(13);
  });

  // triste
  it('has nothing to cut in an empty label', () => {
    expect(shorten('')).toBe('');
  });
});

describe('configOf', () => {
  // feliz
  it('names the series with what the screen called it', () => {
    expect(configOf('Chamados')).toEqual({ value: { label: 'Chamados' } });
  });
});

describe('ColumnChart', () => {
  // feliz
  /* O desenho é SVG, e SVG não se tabula nem se lê: quem usa leitor de tela ou só o teclado
     chega aos números por esta lista. */
  it('announces every slice with its own value', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Tarefas' } } });

    expect(screen.getByRole('img', { name: 'Tarefas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Bia: 9')).toBeInTheDocument();
  });

  /* O gráfico é o caminho para a lista filtrada, não um enfeite. */
  it('turns each slice into a button and reports which one was chosen', async () => {
    const onSelect = vi.fn();
    render(ColumnChart, {
      props: { data: { slices, seriesLabel: 'Tarefas' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Ana: 12' }));

    expect(onSelect).toHaveBeenCalledWith('Ana');
  });

  it('draws lying down when asked, and still announces the same slices', () => {
    render(ColumnChart, {
      props: { data: { slices, seriesLabel: 'Tarefas' }, ui: { orientation: 'horizontal' } },
    });

    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
  });

  // triste
  /* Um `<button>` que não leva a lugar nenhum aparece na tabulação como se levasse. */
  it('is not clickable when there is nowhere to go', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Tarefas' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
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
