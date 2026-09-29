import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Harness from './panel-card-harness.test.svelte';

describe('PanelCard', () => {
  // feliz
  it('shows the title, the explanation and the content', () => {
    render(Harness, {
      props: { title: 'Mapa de problemas', hint: 'O que mais aparece no mês' },
    });

    expect(screen.getByRole('heading', { name: 'Mapa de problemas' })).toBeInTheDocument();
    expect(screen.getByText('O que mais aparece no mês')).toBeInTheDocument();
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  /* O controle de recorte fica no ALTO: quem lê precisa saber o recorte antes de ler o
     número, e não depois. */
  it('puts the control above the content, not below it', () => {
    const { container } = render(Harness, { props: { title: 'Manutenções', hasTools: true } });

    const control = screen.getByRole('button', { name: 'Mês' });
    const content = screen.getByTestId('conteudo');

    expect(container.contains(control)).toBe(true);
    expect(control.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  /**
   * A borda é fina e EM VOLTA, nunca colorida de um lado só — é a regra visual do projeto:
   * ou o cartão é colorido inteiro, ou a borda é fina em volta, ou não há borda.
   */
  it('draws a thin border all around, never on one side alone', () => {
    const { container } = render(Harness, { props: { title: 'Mapa de problemas' } });

    const card = container.querySelector('section');

    expect(card?.className).toContain('border-border');
    expect(card?.className).not.toMatch(/border-[lrtb]-\d/);
  });

  // triste
  /* Sem explicação a linha de baixo não existe — e não vira um parágrafo vazio empurrando o
     conteúdo para baixo. */
  it('writes no explanation line when there is none', () => {
    const { container } = render(Harness, { props: { title: 'Mapa de problemas' } });

    expect(container.querySelector('h2 + p')).toBeNull();
  });

  it('draws no control area when the block has no control (edge case)', () => {
    render(Harness, { props: { title: 'Mapa de problemas' } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
