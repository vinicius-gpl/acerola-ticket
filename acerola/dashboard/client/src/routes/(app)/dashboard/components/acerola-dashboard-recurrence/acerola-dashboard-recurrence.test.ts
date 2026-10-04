import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import DashboardRecurrence, {
  machineSlices,
  personSlices,
} from './acerola-dashboard-recurrence.svelte';

const byPerson = [
  { requesterName: 'Daniela Prado', department: 'recepcao', problemType: 'printer', count: 4 },
];

const byMachine = [
  { computerId: 2, computerName: 'CONTABIL-02', problemType: 'slow_computer', count: 4 },
];

function renderBlock(props: Record<string, unknown> = {}) {
  return render(DashboardRecurrence, { props: { data: { byPerson, byMachine }, ...props } });
}

describe('personSlices', () => {
  // feliz
  /* Juntar a pessoa com o problema errado apontaria o treinamento para o assunto errado. */
  it('joins who repeats with what repeats', () => {
    expect(personSlices(byPerson)[0]).toEqual({ label: 'Daniela Prado · Impressora', value: 4 });
  });

  // triste
  it('has nothing to draw when nobody repeated', () => {
    expect(personSlices([])).toEqual([]);
  });
});

describe('machineSlices', () => {
  // feliz
  /* Juntar a máquina com o problema errado apontaria a troca de equipamento para a máquina
     errada — e troca de equipamento é dinheiro. */
  it('joins which machine repeats with what repeats on it', () => {
    expect(machineSlices(byMachine)[0]).toEqual({
      label: 'CONTABIL-02 · Computador lento',
      value: 4,
    });
  });

  // triste
  it('has nothing to draw when no machine repeated', () => {
    expect(machineSlices([])).toEqual([]);
  });
});

describe('AcerolaDashboardRecurrence', () => {
  // feliz
  it('starts on the person, and says what that reading points to', () => {
    renderBlock();

    expect(screen.getByLabelText('Daniela Prado · Impressora: 4')).toBeInTheDocument();
    expect(screen.getByText(/treinamento ou equipamento compartilhado/)).toBeInTheDocument();
  });

  /**
   * Por máquina é o que o sistema antigo NÃO conseguia ver — lá o chamado não apontava para
   * computador nenhum, então só dava para agrupar por pessoa.
   */
  it('swaps to the machine reading, which points to swapping equipment', async () => {
    const user = userEvent.setup();
    renderBlock();

    await user.click(screen.getByRole('button', { name: 'Por máquina' }));

    expect(screen.getByLabelText('CONTABIL-02 · Computador lento: 4')).toBeInTheDocument();
    expect(screen.getByText(/troca de equipamento/)).toBeInTheDocument();
  });

  // triste
  /* Nada se repetindo é a melhor notícia do painel, e a tela diz isso em vez de mostrar um
     gráfico vazio que parece defeito. */
  it('celebrates instead of drawing an empty chart when nothing repeated', () => {
    render(DashboardRecurrence, { props: { data: { byPerson: [], byMachine: [] } } });

    expect(screen.getByText(/melhor notícia deste painel/)).toBeInTheDocument();
  });

  /* Alguém pode repetir sem que nenhuma máquina repita: cada lado tem o próprio vazio. */
  it('shows the empty message only on the side that is empty (edge case)', async () => {
    const user = userEvent.setup();
    render(DashboardRecurrence, { props: { data: { byPerson, byMachine: [] } } });

    expect(screen.queryByText(/melhor notícia deste painel/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Por máquina' }));

    expect(screen.getByText(/melhor notícia deste painel/)).toBeInTheDocument();
  });

  it('says nothing about emptiness while loading (edge case)', () => {
    render(DashboardRecurrence, {
      props: { data: { byPerson: [], byMachine: [] }, state: { isLoading: true } },
    });

    expect(screen.queryByText(/melhor notícia deste painel/)).not.toBeInTheDocument();
  });
});
