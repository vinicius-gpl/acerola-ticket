import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import StatCardGrid from './stat-card-grid.svelte';

const cards = createRawSnippet(() => ({
  render: () => '<div><span>Clientes</span><span>Concluídas</span></div>',
}));

describe('StatCardGrid', () => {
  // feliz
  it('draws what it is given', () => {
    render(StatCardGrid, { props: { children: cards } });

    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Concluídas')).toBeInTheDocument();
  });

  /* A grade é a única razão de o componente existir: quatro colunas em tela larga, duas em
     tela média, uma no celular. Se as classes saírem, os cartões empilham em qualquer
     largura e o painel perde a leitura de relance. */
  it('lays the cards out in a responsive grid', () => {
    const { container } = render(StatCardGrid, { props: { children: cards } });

    const grid = container.querySelector('div');
    expect(grid).toHaveClass('grid', 'sm:grid-cols-2', 'lg:grid-cols-4');
  });

  it('accepts extra classes without losing the grid', () => {
    const { container } = render(StatCardGrid, {
      props: { children: cards, ui: { className: 'mt-6' } },
    });

    const grid = container.querySelector('div');
    expect(grid).toHaveClass('mt-6');
    expect(grid).toHaveClass('grid');
  });

  // triste
  /* Sem cartão nenhum a grade não pode desenhar uma caixa vazia com espaçamento. */
  it('renders nothing inside when there is no card (edge case)', () => {
    const { container } = render(StatCardGrid, { props: {} });

    const grid = container.querySelector('div');
    expect(grid).toBeInTheDocument();
    expect(grid?.textContent).toBe('');
  });
});
