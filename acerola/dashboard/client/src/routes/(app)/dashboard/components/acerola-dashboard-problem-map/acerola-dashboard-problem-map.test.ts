import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardProblemMap, { toSlices } from './acerola-dashboard-problem-map.svelte';

const byProblemType = [
  { key: 'printer', count: 6 },
  { key: 'network', count: 4 },
];

const byMaintenanceType = [
  { key: 'preventive', count: 5 },
  { key: 'formatting', count: 2 },
];

function renderMap(props: Record<string, unknown> = {}) {
  return render(DashboardProblemMap, {
    props: { data: { byProblemType, byMaintenanceType }, ...props },
  });
}

describe('toSlices', () => {
  // feliz
  it('reads a ticket key as the words on screen', () => {
    expect(toSlices([{ key: 'printer', count: 6 }], 'tickets')[0]).toEqual({
      label: 'Impressora',
      value: 6,
    });
  });

  it('reads a maintenance key with the maintenance catalogue, not the ticket one', () => {
    const [slice] = toSlices([{ key: 'preventive', count: 5 }], 'maintenance');

    expect(slice?.label).not.toBe('preventive');
    expect(slice?.value).toBe(5);
  });

  // triste
  /**
   * Chave que o catálogo não conhece continua aparecendo, com a chave crua.
   *
   * Fatia que some esconde que há registro com um tipo que ninguém cadastrou — e é
   * justamente isso que alguém precisa ver para corrigir.
   */
  it('keeps a key the catalogue does not know, showing it raw (edge case)', () => {
    expect(toSlices([{ key: 'coisa-nova', count: 2 }], 'tickets')[0]?.label).toBe('coisa-nova');
  });

  it('turns an empty period into an empty chart, not into an error', () => {
    expect(toSlices([], 'tickets')).toEqual([]);
  });
});

describe('AcerolaDashboardProblemMap', () => {
  // feliz
  it('starts on the tickets, which is the question people ask first', () => {
    renderMap();

    expect(screen.getByText('Impressora')).toBeInTheDocument();
    expect(screen.getByText('O que as pessoas mais abriram no período')).toBeInTheDocument();
  });

  /**
   * As duas listas respondem à mesma pergunta por caminhos diferentes — "Impressora" campeã
   * nos chamados é gente reclamando, e um tipo campeão na manutenção é trabalho já feito.
   * Ver as duas no MESMO desenho é o que deixa comparar sem abrir outra tela.
   */
  it('swaps the whole map to the maintenance side', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: 'Manutenção' }));

    expect(screen.getByText('O que o TI mais fez no mês')).toBeInTheDocument();
    expect(screen.queryByText('Impressora')).not.toBeInTheDocument();
  });

  it('reports which slice was chosen', async () => {
    const user = userEvent.setup();
    const onSelectProblem = vi.fn();
    renderMap({ actions: { onSelectProblem } });

    await user.click(screen.getByRole('button', { name: /Impressora/ }));

    expect(onSelectProblem).toHaveBeenCalledWith('Impressora');
  });

  // triste
  it('says the period brought no ticket instead of drawing an empty ring', () => {
    render(DashboardProblemMap, {
      props: { data: { byProblemType: [], byMaintenanceType } },
    });

    expect(screen.getByText('Nenhum chamado no período.')).toBeInTheDocument();
  });

  it('says the month brought no maintenance on the other side (edge case)', async () => {
    const user = userEvent.setup();
    render(DashboardProblemMap, {
      props: { data: { byProblemType, byMaintenanceType: [] } },
    });

    await user.click(screen.getByRole('button', { name: 'Manutenção' }));

    expect(screen.getByText('Nenhuma manutenção no mês.')).toBeInTheDocument();
  });

  /* Vazio só é vazio depois que a consulta terminou (CONTRIBUTING §15). */
  it('says nothing about emptiness while loading (edge case)', () => {
    render(DashboardProblemMap, {
      props: { data: { byProblemType: [], byMaintenanceType: [] }, state: { isLoading: true } },
    });

    expect(screen.queryByText('Nenhum chamado no período.')).not.toBeInTheDocument();
  });
});
