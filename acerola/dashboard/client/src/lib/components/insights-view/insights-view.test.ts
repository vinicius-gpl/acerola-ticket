import { type Insights } from '@template/shared/schemas/insight.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InsightsView, {
  machineLabelOf,
  overloadSummaryOf,
  spareSummaryOf,
  troubleSummaryOf,
  upgradeSummaryOf,
} from './insights-view.svelte';

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

function renderView(
  over: { insights?: Insights | null; state?: Partial<typeof settled> } = {},
) {
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
  it('counts the maintenance and the alerts', () => {
    expect(troubleSummaryOf(insights().troublesome[0]!)).toBe(
      '3 manutenções já feitas · 2 alerta(s) no período',
    );
  });

  // triste
  it('leaves the alerts out when there was none', () => {
    const quiet = { ...insights().troublesome[0]!, alertCount: 0 };

    expect(troubleSummaryOf(quiet)).toBe('3 manutenções já feitas');
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

describe('InsightsView', () => {
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
