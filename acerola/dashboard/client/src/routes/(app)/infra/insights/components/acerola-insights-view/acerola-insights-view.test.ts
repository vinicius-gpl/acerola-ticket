import { type Insights } from '@template/shared/schemas/insight.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InsightsView, {
  machineLabelOf,
  overloadSlices,
  overloadSummaryOf,
  spareSummaryOf,
  troubleSummaryOf,
  upgradeSlices,
  upgradeSummaryOf,
} from './acerola-insights-view.svelte';

function insights(over: Partial<Insights> = {}): Insights {
  return {
    days: 30,
    overloaded: [
      {
        computerId: 2,
        computerName: 'FINANCEIRO-02',
        computerDisplayName: 'Financeiro — mesa 2',
        department: 'financeiro',
        averageCpuPercent: 41,
        averageMemoryPercent: 89,
        sampleCount: 288,
        activeAlerts: 1,
      },
    ],
    upgrades: [
      {
        computerId: 2,
        computerName: 'FINANCEIRO-02',
        computerDisplayName: 'Financeiro — mesa 2',
        department: 'financeiro',
        reason: 'memory',
        value: 4,
        healthScore: 88,
        healthStatus: 'attention',
      },
    ],
    troublesome: [
      {
        computerId: 2,
        computerName: 'FINANCEIRO-02',
        computerDisplayName: 'Financeiro — mesa 2',
        department: 'financeiro',
        maintenanceCount: 3,
        alertCount: 2,
        ticketCount: 5,
        lastMaintenanceAt: '2026-06-20T12:00:00.000Z',
      },
    ],
    spares: [
      {
        computerId: 5,
        computerName: 'COMERCIAL-05',
        computerDisplayName: 'Comercial — notebook de visita',
        department: null,
        healthScore: 100,
        healthStatus: 'good',
        memoryGb: 16,
        diskGb: 512,
        cpuModel: 'Intel Core i7-1165G7',
        lastSeenAt: '2026-09-16T12:00:00.000Z',
      },
    ],
    ...over,
  };
}

const actions = {
  onPeriodChange: vi.fn(),
  onRetry: vi.fn(),
  onOpenMachine: vi.fn(),
  onOpenComputers: vi.fn(),
};

const settled: { isLoading: boolean; isEmpty: boolean; error: string | null } = {
  isLoading: false,
  isEmpty: false,
  error: null,
};

function renderView(over: { insights?: Insights | null; state?: Partial<typeof settled> } = {}) {
  return render(InsightsView, {
    props: {
      data: { insights: over.insights === undefined ? insights() : over.insights, days: 30 },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname the IT team gave', () => {
    expect(machineLabelOf({ computerName: 'X-01', computerDisplayName: 'Recepção' })).toBe(
      'Recepção',
    );
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(machineLabelOf({ computerName: 'X-01', computerDisplayName: null })).toBe('X-01');
  });
});

describe('overloadSlices', () => {
  // feliz
  /**
   * A barra mede a MÉDIA, e não o pico.
   *
   * Todo computador chega a 100% ao abrir um programa; ordenar pelo pico colocaria na frente
   * justamente a máquina que está bem — e o gráfico apontaria para a troca errada.
   */
  it('measures the average and puts the worst machine in front', () => {
    const slices = overloadSlices([
      { ...insights().overloaded[0]!, computerDisplayName: 'Calma', averageCpuPercent: 41 },
      { ...insights().overloaded[0]!, computerDisplayName: 'Sufocada', averageCpuPercent: 92 },
    ]);

    expect(slices).toEqual([
      { label: 'Sufocada', value: 92 },
      { label: 'Calma', value: 41 },
    ]);
  });

  // triste
  it('draws nothing when no machine is living on the edge', () => {
    expect(overloadSlices([])).toEqual([]);
  });
});

describe('upgradeSlices', () => {
  // feliz
  /* A rosca conta MÁQUINAS por motivo, e não os números que sustentam cada recomendação:
     somar "4 GB" com "12% livre" daria um número sem significado nenhum. */
  it('counts how many machines each reason explains', () => {
    const base = insights().upgrades[0]!;
    const slices = upgradeSlices([
      { ...base, reason: 'memory' },
      { ...base, reason: 'disk' },
      { ...base, reason: 'memory' },
    ]);

    expect(slices[0]?.value).toBe(2);
    expect(slices.reduce((sum, slice) => sum + slice.value, 0)).toBe(3);
  });

  // triste
  it('draws nothing when no machine is asking for an upgrade', () => {
    expect(upgradeSlices([])).toEqual([]);
  });
});

describe('overloadSummaryOf', () => {
  // feliz
  /* A recomendação vem com o NÚMERO: sem ele, é só uma opinião da tela. */
  it('says the averages that put the machine on the list', () => {
    expect(overloadSummaryOf(insights().overloaded[0]!)).toBe(
      'Processador em 41% e memória em 89%, na média',
    );
  });
});

describe('upgradeSummaryOf', () => {
  // feliz
  it('says how much memory the machine has', () => {
    expect(upgradeSummaryOf(insights().upgrades[0]!)).toBe('Tem 4 GB de memória');
  });

  it('says how little disk is left', () => {
    const disk = { ...insights().upgrades[0]!, reason: 'disk' as const, value: 8 };

    expect(upgradeSummaryOf(disk)).toBe('Só 8% de espaço livre no disco');
  });
});

describe('troubleSummaryOf', () => {
  // feliz
  /* As três contas lado a lado, e nunca somadas: uma é trabalho feito, outra é a máquina
     reclamando sozinha, a terceira é uma pessoa reclamando. */
  it('counts maintenance, alerts and tickets side by side', () => {
    expect(troubleSummaryOf(insights().troublesome[0]!)).toBe(
      '3 manutenções já feitas · 2 alerta(s) no período · 5 chamado(s) no período',
    );
  });

  // triste
  it('leaves the alerts out when there was none', () => {
    const quiet = { ...insights().troublesome[0]!, alertCount: 0 };

    expect(troubleSummaryOf(quiet)).toBe('3 manutenções já feitas · 5 chamado(s) no período');
  });

  /* Máquina sem chamado vinculado é o caso comum — o campo é opcional no chamado. */
  it('leaves the tickets out when no ticket points to the machine (edge case)', () => {
    const unlinked = { ...insights().troublesome[0]!, alertCount: 0, ticketCount: 0 };

    expect(troubleSummaryOf(unlinked)).toBe('3 manutenções já feitas');
  });
});

describe('spareSummaryOf', () => {
  // feliz
  it('says what the spare machine has inside', () => {
    expect(spareSummaryOf(insights().spares[0]!)).toBe(
      'Intel Core i7-1165G7 · 16 GB de memória · 512 GB de disco',
    );
  });

  // triste
  /* Máquina cadastrada sem agente: a tela diz isso, em vez de mostrar uma linha vazia. */
  it('says the agent has not reported instead of showing nothing', () => {
    const unknown = {
      ...insights().spares[0]!,
      cpuModel: null,
      memoryGb: null,
      diskGb: null,
    };

    expect(spareSummaryOf(unknown)).toBe('O agente ainda não informou o hardware');
  });
});

describe('AcerolaInsightsView', () => {
  // feliz
  it('shows the four lists, each with the rule it used', () => {
    renderView();

    expect(screen.getByText('Máquinas sobrecarregadas')).toBeInTheDocument();
    expect(screen.getByText('Quem precisa de upgrade')).toBeInTheDocument();
    expect(screen.getByText('Máquinas que dão mais trabalho')).toBeInTheDocument();
    expect(screen.getByText('Máquinas de reserva')).toBeInTheDocument();
  });

  /* A régua fica à vista: quem lê precisa poder discordar dela com conhecimento de causa. */
  it('says out loud that tickets do not point at machines', () => {
    renderView();

    expect(screen.getByText(/não diz de qual máquina se trata/)).toBeInTheDocument();
  });

  it('opens the record of a machine from any list', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getAllByRole('button', { name: 'Abrir ficha' })[0]!);

    expect(actions.onOpenMachine).toHaveBeenCalledWith(2);
  });

  // feliz
  it('paginates lists with more than 5 machines', async () => {
    const user = userEvent.setup();
    const manyOverloaded = Array.from({ length: 8 }, (_, i) => ({
      computerId: 10 + i,
      computerName: `PC-${10 + i}`,
      computerDisplayName: `Máquina ${10 + i}`,
      department: 'rh' as const,
      averageCpuPercent: 50 + i,
      averageMemoryPercent: 85,
      sampleCount: 100,
      activeAlerts: 0,
    }));

    renderView({
      insights: insights({ overloaded: manyOverloaded }),
    });

    const section = screen
      .getByRole('heading', { name: 'Máquinas sobrecarregadas' })
      .closest('section')!;
    const { getByText, queryByText, getByRole } = within(section);

    expect(getByText('Máquina 10')).toBeInTheDocument();
    expect(getByText('Máquina 14')).toBeInTheDocument();
    expect(queryByText('Máquina 15')).not.toBeInTheDocument();

    const nextButton = getByRole('button', { name: /Próxima/i });
    expect(nextButton).toBeInTheDocument();
    await user.click(nextButton);

    expect(getByText('Máquina 15')).toBeInTheDocument();
    expect(getByText('Máquina 17')).toBeInTheDocument();
  });

  // triste
  /* Nada a recomendar é boa notícia, e ela é dita — não são quatro listas vazias em branco. */
  it('celebrates when there is nothing to recommend', () => {
    renderView({
      insights: insights({ overloaded: [], upgrades: [], troublesome: [], spares: [] }),
    });

    expect(screen.getByText(/Nada a recomendar/)).toBeInTheDocument();
  });

  it('tells a park with no machines where to start', () => {
    renderView({ state: { isEmpty: true } });

    expect(screen.getByText('Ainda não há o que cruzar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o Inventário' })).toBeInTheDocument();
  });

  it('shows the reason the data did not load', () => {
    renderView({ insights: null, state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('does not show recommendations while it is still loading', () => {
    renderView({ insights: null, state: { isLoading: true } });

    expect(screen.getByText('Cruzando os dados do parque…')).toBeInTheDocument();
    expect(screen.queryByText('Máquinas sobrecarregadas')).not.toBeInTheDocument();
  });
});
