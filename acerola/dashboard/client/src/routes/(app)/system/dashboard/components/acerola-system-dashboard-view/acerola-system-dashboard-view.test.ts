import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SystemDashboardView, {
  type AcerolaSystemDashboardViewProps,
} from './acerola-system-dashboard-view.svelte';

function renderView(
  overrides: {
    data?: Partial<AcerolaSystemDashboardViewProps['data']>;
    state?: Partial<AcerolaSystemDashboardViewProps['state']>;
  } = {},
) {
  const actions = {
    onRetry: vi.fn(),
    onOpenTickets: vi.fn(),
    onOpenKanban: vi.fn(),
    onOpenSchedule: vi.fn(),
    onOpenProjects: vi.fn(),
  };

  render(SystemDashboardView, {
    props: {
      data: {
        summary: {
          monthName: 'Outubro',
          monthYear: 'Outubro de 2026',
          projectsSummary: { total: 4, active: 2, maintenance: 1, deprecated: 1 },
          ticketsMonthSummary: {
            opened: 10,
            resolved: 8,
            pending: 2,
            resolutionRate: 80,
            averageResolutionHours: 3.2,
          },
          ticketsByProblemType: [
            { key: 'bug', label: 'Defeito / Bug', count: 5 },
          ],
          prsMonthSummary: { opened: 1, merged: 5, total: 6 },
          weeklyTrend: [
            { weekLabel: 'Semana 1', openedTickets: 2, resolvedTickets: 2, pullRequests: 1 },
          ],
          recentTimeline: [],
        },
        ...overrides.data,
      },
      state: {
        isLoading: false,
        error: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('AcerolaSystemDashboardView', () => {
  // feliz
  it('renders monthly summary indicators and charts correctly', () => {
    renderView();

    expect(screen.getByText('Painel de Desenvolvimento e Sistemas')).toBeInTheDocument();
    expect(screen.getByText('Chamados no Mês')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText('PRs no Mês')).toBeInTheDocument();
  });

  it('navigates to schedule when Cronograma button is clicked', async () => {
    const actions = renderView();

    const scheduleBtn = screen.getByRole('button', { name: /cronograma/i });
    await userEvent.click(scheduleBtn);

    expect(actions.onOpenSchedule).toHaveBeenCalled();
  });

  // triste
  it('shows error state when summary fails to load', () => {
    renderView({
      data: { summary: null },
      state: { error: 'Erro ao carregar dados do painel' },
    });

    expect(screen.getByText(/não foi possível carregar o painel/i)).toBeInTheDocument();
  });
});
