import { type PeakingMachine } from '@template/shared/schemas/dashboard.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import DashboardPeaking, { toSlices } from './acerola-dashboard-peaking.svelte';

function peaking(over: Partial<PeakingMachine> = {}): PeakingMachine {
  return {
    computerId: 1,
    computerName: 'CONTABIL-03',
    today: 2,
    month: 9,
    topMetric: 'memory',
    ...over,
  };
}

describe('toSlices', () => {
  // feliz
  /**
   * Mostrar a contagem do mês na aba "Hoje" faria a tela acusar de crônica uma máquina que
   * só teve um dia ruim — e é justamente essa distinção que o bloco existe para fazer.
   */
  it('reads the count of the range that is on screen', () => {
    const machines = [peaking({ today: 2, month: 9 })];

    expect(toSlices(machines, 'today')[0]?.value).toBe(2);
    expect(toSlices(machines, 'month')[0]?.value).toBe(9);
  });

  it('says which measure blew up, in the name of the bar', () => {
    expect(toSlices([peaking({ topMetric: 'memory' })], 'today')[0]?.label).toBe(
      'CONTABIL-03 · memória',
    );
  });

  it('puts the machine that peaked the most in front', () => {
    const slices = toSlices(
      [
        peaking({ computerId: 1, computerName: 'CALMA-01', today: 1 }),
        peaking({ computerId: 2, computerName: 'AGITADA-02', today: 7 }),
      ],
      'today',
    );

    expect(slices.map((slice) => slice.value)).toEqual([7, 1]);
  });

  // triste
  /* Barra de tamanho zero não é informação: é um risco no eixo que faz o gráfico parecer
     quebrado. */
  it('leaves out a machine that did not peak in the chosen range', () => {
    expect(toSlices([peaking({ today: 0, month: 9 })], 'today')).toEqual([]);
  });

  /* Sem medida campeã, o nome da máquina basta — melhor que um traço solto. */
  it('names the machine alone when no measure stood out (edge case)', () => {
    expect(toSlices([peaking({ topMetric: null })], 'today')[0]?.label).toBe('CONTABIL-03');
  });

  it('draws nothing when no machine peaked at all', () => {
    expect(toSlices([], 'month')).toEqual([]);
  });
});

describe('AcerolaDashboardPeaking', () => {
  // feliz
  it('starts on today, which is what is happening now', () => {
    render(DashboardPeaking, { props: { data: { machines: [peaking()] } } });

    expect(screen.getByLabelText('CONTABIL-03 · memória: 2')).toBeInTheDocument();
  });

  it('swaps to the month, which says whether it is chronic', async () => {
    const user = userEvent.setup();
    render(DashboardPeaking, { props: { data: { machines: [peaking()] } } });

    await user.click(screen.getByRole('button', { name: 'No mês' }));

    expect(screen.getByLabelText('CONTABIL-03 · memória: 9')).toBeInTheDocument();
  });

  /**
   * O bloco diz que é INFORMATIVO com todas as letras: todo computador chega a 100% ao abrir
   * um programa, e apontar isso como defeito encheria o painel de falso alarme.
   */
  it('says out loud that peaking is informative, not a defect', () => {
    render(DashboardPeaking, { props: { data: { machines: [peaking()] } } });

    expect(screen.getByText(/todo computador chega a 100%/i)).toBeInTheDocument();
  });

  // triste
  it('says nobody peaked today instead of drawing an empty chart', () => {
    render(DashboardPeaking, { props: { data: { machines: [] } } });

    expect(screen.getByText('Nenhuma máquina bateu no teto hoje.')).toBeInTheDocument();
  });

  it('says nobody peaked this month on the other side (edge case)', async () => {
    const user = userEvent.setup();
    render(DashboardPeaking, { props: { data: { machines: [] } } });

    await user.click(screen.getByRole('button', { name: 'No mês' }));

    expect(screen.getByText('Nenhuma máquina bateu no teto neste mês.')).toBeInTheDocument();
  });

  it('says nothing about emptiness while loading (edge case)', () => {
    render(DashboardPeaking, { props: { data: { machines: [] }, state: { isLoading: true } } });

    expect(screen.queryByText('Nenhuma máquina bateu no teto hoje.')).not.toBeInTheDocument();
  });
});
