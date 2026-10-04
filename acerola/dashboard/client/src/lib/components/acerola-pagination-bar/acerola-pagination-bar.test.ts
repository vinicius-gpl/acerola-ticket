import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PaginationBar, { pageCountOf, rangeLabelOf } from './acerola-pagination-bar.svelte';

const noun: [string, string] = ['alerta', 'alertas'];

function renderBar(over: Record<string, unknown> = {}, onPageChange = vi.fn()) {
  render(PaginationBar, {
    props: {
      data: { page: 2, pageSize: 25, total: 312, noun, ...over },
      actions: { onPageChange },
    },
  });

  return onPageChange;
}

describe('pageCountOf', () => {
  // feliz
  it('rounds the last, incomplete page up', () => {
    expect(pageCountOf(312, 25)).toBe(13);
    expect(pageCountOf(50, 25)).toBe(2);
  });

  // triste
  /* Zero item ainda é UMA página: a que diz que não há nada. Zero páginas faria a barra
     anunciar "página 1 de 0". */
  it('counts an empty list as one page (edge case)', () => {
    expect(pageCountOf(0, 25)).toBe(1);
  });

  /* Tamanho de página zero viria de uma consulta quebrada; dividir por ele daria infinito. */
  it('never divides by a page size of zero (edge case)', () => {
    expect(pageCountOf(312, 0)).toBe(1);
  });
});

describe('rangeLabelOf', () => {
  // feliz
  /**
   * É a frase que impede a lista de MENTIR POR OMISSÃO.
   *
   * Errar a conta aqui diz à pessoa que ela já viu tudo quando não viu — e ela decide sobre
   * uma máquina achando que conhece o histórico inteiro dela.
   */
  it('says where this page sits inside the whole list', () => {
    expect(rangeLabelOf({ page: 2, pageSize: 25, total: 312, noun })).toBe(
      '26–50 de 312 alertas',
    );
  });

  /* Uma página só: "1–7 de 7" é ruído, o total já responde tudo. */
  it('says only the total when everything fits on one page', () => {
    expect(rangeLabelOf({ page: 1, pageSize: 25, total: 7, noun })).toBe('7 alertas');
  });

  it('writes one item in the singular', () => {
    expect(rangeLabelOf({ page: 1, pageSize: 25, total: 1, noun })).toBe('1 alerta');
  });

  /* A última página quase sempre é incompleta: o fim é o total, não `página × tamanho`. */
  it('stops the range at the total on the last, incomplete page (edge case)', () => {
    expect(rangeLabelOf({ page: 13, pageSize: 25, total: 312, noun })).toBe(
      '301–312 de 312 alertas',
    );
  });

  // triste
  it('says there is none instead of writing a range of zeros', () => {
    expect(rangeLabelOf({ page: 1, pageSize: 25, total: 0, noun })).toBe('Nenhum alerta');
  });
});

describe('AcerolaPaginationBar', () => {
  // feliz
  it('says where the person is and how many pages there are', () => {
    renderBar();

    expect(screen.getByText('26–50 de 312 alertas')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 13')).toBeInTheDocument();
  });

  it('walks forward and backward', async () => {
    const user = userEvent.setup();
    const onPageChange = renderBar();

    await user.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  // triste
  /**
   * Nas pontas o botão fica DESLIGADO, e não escondido.
   *
   * Um botão que some faz a barra inteira pular de lugar no clique que leva à última página —
   * e o ponteiro da pessoa fica em cima de outra coisa.
   */
  it('disables the walk at the ends instead of hiding it', async () => {
    const user = userEvent.setup();
    const onPageChange = renderBar({ page: 1 });

    const previous = screen.getByRole('button', { name: /Anterior/ });

    expect(previous).toBeDisabled();
    await user.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('disables the next page on the last one', () => {
    renderBar({ page: 13 });

    expect(screen.getByRole('button', { name: /Próxima/ })).toBeDisabled();
  });

  /* Com uma página só não há para onde andar: os botões não aparecem, e sobra o total. */
  it('shows no walk when everything fits on one page (edge case)', () => {
    renderBar({ page: 1, total: 7 });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('7 alertas')).toBeInTheDocument();
  });

  /* Enquanto a página nova está vindo, clicar de novo enfileiraria buscas que ninguém pediu. */
  it('does not walk while the next page is still coming (edge case)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(PaginationBar, {
      props: {
        data: { page: 2, pageSize: 25, total: 312, noun },
        state: { isLoading: true },
        actions: { onPageChange },
      },
    });

    await user.click(screen.getByRole('button', { name: /Próxima/ }));

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
