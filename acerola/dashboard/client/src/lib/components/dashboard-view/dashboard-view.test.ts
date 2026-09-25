import { type Dashboard, type ProblemMachine } from '@template/shared/schemas/dashboard.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardView, {
  formatAverage,
  machineLabelOf,
  problemSummaryOf,
  toSlices,
} from './dashboard-view.svelte';

function machine(over: Partial<ProblemMachine> = {}): ProblemMachine {
  return {
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — mesa do fechamento',
    department: 'contabil',
    healthScore: 63,
    healthStatus: 'critical',
    activeAlerts: 1,
    maintenanceCount: 1,
    ...over,
  };
}

function summary(over: Partial<Dashboard> = {}): Dashboard {
  return {
    days: 30,
    park: { total: 7, critical: 1, attention: 1, neverSeen: 1 },
    tickets: {
      open: 5,
      inProgress: 2,
      openedInPeriod: 12,
      resolvedInPeriod: 5,
      averageResolutionHours: 1.8,
    },
    maintenance: { doneInPeriod: 4, preventiveDue: 5 },
    parts: { kinds: 8, items: 23, outOfStock: 1 },
    worstMachines: [machine()],
    byProblemType: [{ key: 'printer', count: 4 }],
    byDepartment: [{ key: 'financeiro', count: 3 }],
    ...over,
  };
}

const actions = {
  onPeriodChange: vi.fn(),
  onRetry: vi.fn(),
  onOpenMachine: vi.fn(),
  onOpenComputers: vi.fn(),
  onOpenTickets: vi.fn(),
  onOpenMaintenance: vi.fn(),
  onOpenParts: vi.fn(),
};

const settled: { isLoading: boolean; isEmpty: boolean; error: string | null } = {
  isLoading: false,
  isEmpty: false,
  error: null,
};

function renderView(
  over: { summary?: Dashboard | null; state?: Partial<typeof settled> } = {},
) {
  return render(DashboardView, {
    props: {
      data: { summary: over.summary === undefined ? summary() : over.summary, days: 30 },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname the IT team gave', () => {
    expect(machineLabelOf(machine())).toBe('Contábil — mesa do fechamento');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(machineLabelOf(machine({ computerDisplayName: null }))).toBe('CONTABIL-03');
  });
});

describe('problemSummaryOf', () => {
  // feliz
  /* "Crítica" sozinho não diz se é disco cheio AGORA ou nota baixa de semanas atrás. */
  it('says what is wrong, not just how bad it is', () => {
    expect(problemSummaryOf(machine({ activeAlerts: 2 }))).toContain('2 alertas acontecendo agora');
  });

  it('counts a single alert in the singular', () => {
    expect(problemSummaryOf(machine({ activeAlerts: 1 }))).toContain('1 alerta acontecendo agora');
  });

  it('points out the machine that already took three services', () => {
    expect(problemSummaryOf(machine({ activeAlerts: 0, maintenanceCount: 4 }))).toContain(
      '4 manutenções já feitas',
    );
  });

  // triste
  /* Sem alerta e sem histórico, o que sobra é a nota — e ela é dita, não escondida. */
  it('falls back to the health score when there is nothing else to say', () => {
    expect(problemSummaryOf(machine({ activeAlerts: 0, maintenanceCount: 0 }))).toBe(
      'Nota de saúde 63/100',
    );
  });
});

describe('formatAverage', () => {
  // feliz
  it('reads the average in hours, with a comma', () => {
    expect(formatAverage(1.8)).toBe('1,8 h');
  });

  it('reads a fast resolution in minutes', () => {
    expect(formatAverage(0.5)).toBe('30 min');
  });

  // triste
  /* Zero anunciaria atendimento instantâneo num período em que nada foi resolvido. */
  it('shows a dash when nothing was resolved', () => {
    expect(formatAverage(null)).toBe('—');
  });
});

describe('toSlices', () => {
  // feliz
  it('reads the keys as the words on screen', () => {
    expect(toSlices([{ key: 'printer', count: 4 }], 'problem')[0]?.label).toBe('Impressora');
    expect(toSlices([{ key: 'financeiro', count: 3 }], 'department')[0]?.label).toBe('FINANCEIRO');
  });

  // triste
  it('turns an empty period into an empty chart, not into an error', () => {
    expect(toSlices([], 'problem')).toEqual([]);
  });
});

describe('DashboardView', () => {
  // feliz
  it('puts what needs action today at the top', () => {
    renderView();

    expect(screen.getByText('Máquinas críticas')).toBeInTheDocument();
    expect(screen.getByText('Preventivas vencidas')).toBeInTheDocument();
    expect(screen.getByText('Peças sem estoque')).toBeInTheDocument();
  });

  /* A fila de AGORA e os que entraram no período são contas diferentes, e o mesmo rótulo
     para as duas é como alguém lê o número errado e decide errado. */
  it('names the queue apart from what came in during the period', () => {
    renderView();

    expect(screen.getByText('Chamados abertos')).toBeInTheDocument();
    expect(screen.getByText('Chamados que entraram')).toBeInTheDocument();
  });

  it('opens the record of the machine that needs attention', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Abrir ficha' }));

    expect(actions.onOpenMachine).toHaveBeenCalledWith(expect.objectContaining({ computerId: 3 }));
  });

  it('says the period it is talking about', () => {
    renderView();

    expect(screen.getByText('Nos últimos 30 dias')).toBeInTheDocument();
  });

  // triste
  /* Parque em ordem é uma boa notícia, e ela é dita — não é uma lista vazia sem explicação. */
  it('celebrates instead of showing an empty map when nothing is wrong', () => {
    renderView({ summary: summary({ worstMachines: [] }) });

    expect(screen.getByText(/O parque está em ordem/)).toBeInTheDocument();
  });

  it('shows the reason the dashboard did not load', () => {
    renderView({ summary: null, state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');
  });

  /* Sistema recém-instalado: sete zeros não ajudam ninguém — o texto diz por onde começar. */
  it('tells a brand new system where to start', () => {
    renderView({ state: { isEmpty: true } });

    expect(screen.getByText('Ainda não há o que resumir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o Inventário' })).toBeInTheDocument();
  });

  it('does not show numbers while it is still loading', () => {
    renderView({ summary: null, state: { isLoading: true } });

    expect(screen.getByText('Montando o painel…')).toBeInTheDocument();
    expect(screen.queryByText('Chamados abertos')).not.toBeInTheDocument();
  });
});
