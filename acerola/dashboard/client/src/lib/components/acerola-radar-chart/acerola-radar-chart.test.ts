import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RadarChart, { configOf, RADAR_MAX_SLICES, shortenAxis } from './acerola-radar-chart.svelte';

const slices = [
  { label: 'Impressora', value: 29 },
  { label: 'Computador lento', value: 30 },
  { label: 'Internet / Rede', value: 15 },
];

describe('shortenAxis', () => {
  // feliz
  it('leaves a name that fits the axis alone', () => {
    expect(shortenAxis('Impressora')).toBe('Impressora');
  });

  /* No radar o nome fica EM VOLTA do desenho, e nomes compridos de eixos vizinhos se
     encavalam. O nome inteiro continua no balão e na lista. */
  it('cuts a long name and marks that it was cut', () => {
    expect(shortenAxis('Instalação de programa')).toBe('Instalação de p…');
  });

  // triste
  it('has nothing to cut in an empty name (edge case)', () => {
    expect(shortenAxis('')).toBe('');
  });

  /* Cortar bem no espaço deixaria "Instalação …", com um buraco antes das reticências que
     parece erro de digitação. */
  it('never leaves a gap before the ellipsis (edge case)', () => {
    expect(shortenAxis('Sistema interno grande')).not.toContain(' …');
  });
});

describe('configOf', () => {
  // feliz
  it('carries the name of the series and the colour of the web', () => {
    expect(configOf('Chamados', 'var(--chart-1)')).toEqual({
      value: { label: 'Chamados', color: 'var(--chart-1)' },
    });
  });
});

describe('RADAR_MAX_SLICES', () => {
  // feliz
  /**
   * O número existe para quem MONTA a tela decidir antes de desenhar.
   *
   * O radar só serve numa faixa: com três eixos vira um triângulo que não diz nada, e passando
   * de uma dúzia os nomes em volta se encavalam. Fora dela, o gráfico certo é a barra deitada.
   */
  it('says out loud how many categories the radar holds', () => {
    expect(RADAR_MAX_SLICES).toBeGreaterThan(6);
    expect(RADAR_MAX_SLICES).toBeLessThanOrEqual(12);
  });
});

describe('AcerolaRadarChart', () => {
  // feliz
  /* O desenho é SVG, e SVG não se tabula nem se lê: quem usa leitor de tela ou só o teclado
     chega aos números por esta lista. E num radar ninguém mede o valor exato a olho. */
  it('announces every category with its own value', () => {
    render(RadarChart, { props: { data: { slices, seriesLabel: 'Chamados' } } });

    expect(screen.getByRole('img', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByLabelText('Impressora: 29')).toBeInTheDocument();
    expect(screen.getByLabelText('Internet / Rede: 15')).toBeInTheDocument();
  });

  it('turns each category into a button and reports which one was chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(RadarChart, {
      props: { data: { slices, seriesLabel: 'Chamados' }, actions: { onSelect } },
    });

    await user.click(screen.getByRole('button', { name: 'Impressora: 29' }));

    expect(onSelect).toHaveBeenCalledWith('Impressora');
  });

  /**
   * A lista escondida tem BOTÕES, e ela é `position: absolute` (`sr-only`).
   *
   * Sem um ancestral posicionado, tabular até eles faria o navegador rolar a página para o
   * elemento distante em que eles se ancorariam — foi o mesmo defeito que quebrou o diálogo
   * do atendimento.
   */
  it('anchors the hidden list to its own block, never to whatever is above', () => {
    const { container } = render(RadarChart, {
      props: { data: { slices, seriesLabel: 'Chamados' }, actions: { onSelect: vi.fn() } },
    });

    const list = container.querySelector('ul.sr-only');

    expect(container.firstElementChild?.className).toContain('relative');
    expect(container.firstElementChild?.contains(list)).toBe(true);
  });

  // triste
  /* Um `<button>` que não leva a lugar nenhum aparece na tabulação como se levasse. */
  it('is not clickable when there is nowhere to go', () => {
    render(RadarChart, { props: { data: { slices, seriesLabel: 'Chamados' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Impressora: 29')).toBeInTheDocument();
  });

  /* Nada a mostrar não é uma teia vazia: é uma frase dizendo isso. */
  it('says there is nothing instead of drawing an empty web (edge case)', () => {
    render(RadarChart, {
      props: {
        data: { slices: [], seriesLabel: 'Chamados' },
        ui: { emptyLabel: 'Ainda não há chamados para comparar.' },
      },
    });

    expect(screen.getByText('Ainda não há chamados para comparar.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem dados": faria a pessoa achar que sumiram. */
  it('shows neither the web nor the empty message while loading (edge case)', () => {
    render(RadarChart, {
      props: { data: { slices: [], seriesLabel: 'Chamados' }, state: { isLoading: true } },
    });

    expect(screen.queryByText(/Sem dados/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
