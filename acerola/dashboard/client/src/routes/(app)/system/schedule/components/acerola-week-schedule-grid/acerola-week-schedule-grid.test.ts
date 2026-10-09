import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WeekScheduleGrid, {
  type AcerolaWeekScheduleGridProps,
} from './acerola-week-schedule-grid.svelte';

function renderView(
  overrides: {
    data?: Partial<AcerolaWeekScheduleGridProps['data']>;
    state?: Partial<AcerolaWeekScheduleGridProps['state']>;
  } = {},
) {
  const actions = {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
    onNewEvent: vi.fn(),
    onSelectEvent: vi.fn(),
    onRetry: vi.fn(),
    onOpenGithubDay: vi.fn(),
    onProjectFilterChange: vi.fn(),
    onAuthorFilterChange: vi.fn(),
    onTypeFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  const mockEvent = {
    id: 1,
    title: 'Deploy da v1.4',
    note: null,
    projectId: null,
    projectName: null,
    date: '2026-10-06',
    startTime: '09:00',
    endTime: '11:00',
    color: 'green' as const,
    category: 'deploy' as const,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const mockDays = [
    {
      dateString: '2026-10-05',
      dayNumber: 5,
      weekdayShort: 'Seg',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-06',
      dayNumber: 6,
      weekdayShort: 'Ter',
      isToday: true,
      isCurrentMonth: true,
      events: [mockEvent],
    },
    {
      dateString: '2026-10-07',
      dayNumber: 7,
      weekdayShort: 'Qua',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-08',
      dayNumber: 8,
      weekdayShort: 'Qui',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-09',
      dayNumber: 9,
      weekdayShort: 'Sex',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-10',
      dayNumber: 10,
      weekdayShort: 'Sáb',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-11',
      dayNumber: 11,
      weekdayShort: 'Dom',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
  ];

  render(WeekScheduleGrid, {
    props: {
      data: {
        monthYearTitle: 'Outubro de 2026',
        viewMode: 'week',
        days: mockDays,
        events: [mockEvent],
        nowTopPx: 100,
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

describe('AcerolaWeekScheduleGrid', () => {
  it('offers project, author and type filters and a clear action', async () => {
    const actions = renderView({
      data: {
        filters: {
          project: '',
          author: 'ana',
          type: '',
          isActive: true,
          projectOptions: [{ value: '', label: 'Todos os projetos' }],
          authorOptions: [
            { value: '', label: 'Todos os autores' },
            { value: 'ana', label: 'ana' },
          ],
        },
      },
    });
    expect(screen.getByRole('button', { name: 'Filtrar por projeto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtrar por autor' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtrar por tipo' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Issues' }));
    expect(actions.onTypeFilterChange).toHaveBeenCalledWith('issue');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows resolved issues in the time grid with their tooltip and daily dialog action', async () => {
    const issue = {
      id: 22,
      projectId: 1,
      type: 'issue' as const,
      externalId: '#22',
      title: 'Corrige impressão',
      description: null,
      url: 'https://github.com/example/project/issues/22',
      author: 'ana',
      status: 'closed' as const,
      eventDate: '2026-10-06T12:30:00Z',
      createdAt: '2026-10-01T12:00:00Z',
    };
    const actions = renderView({
      data: {
        githubEvents: [issue],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: false,
            isCurrentMonth: true,
            events: [],
            githubEvents: [issue],
          },
        ],
      },
    });
    const link = screen.getAllByRole('link', { name: /Corrige impressão/ })[0]!;
    expect(link.closest('[data-slot="github-hour-event"]')).toHaveStyle({ height: '52px' });
    await userEvent.hover(link);
    expect(await screen.findByText('Issue #22 · Resolvida')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 issue do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06', 'issue');
  });
  it('explains navigation on keyboard focus without blocking the action', async () => {
    const actions = renderView();
    await userEvent.tab();
    const previous = screen.getByRole('button', { name: 'Semana anterior' });
    expect(previous).toHaveFocus();
    await waitFor(() => expect(previous).toHaveAttribute('aria-describedby'));
    expect(document.getElementById(previous.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Semana anterior',
    );
    await userEvent.keyboard('{Enter}');
    expect(actions.onPrev).toHaveBeenCalledOnce();
  });

  it('shows the new appointment hint when its button receives keyboard focus', async () => {
    renderView();
    for (let index = 0; index < 7; index++) await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Novo agendamento' })).toHaveFocus();
    expect(
      await screen.findByText('Criar um agendamento na agenda de sistemas'),
    ).toBeInTheDocument();
  });

  it.each(['week', 'month'] as const)(
    'shows full appointment details in the %s tooltip',
    async (viewMode) => {
      const actions = renderView({ data: { viewMode } });
      const appointment = screen.getByRole('button', { name: /Deploy da v1.4/ });
      await userEvent.hover(appointment);
      await waitFor(() => expect(appointment).toHaveAttribute('aria-describedby'));
      const tooltip = document.getElementById(appointment.getAttribute('aria-describedby')!);
      expect(tooltip).toHaveTextContent('Deploy da v1.4');
      expect(tooltip).toHaveTextContent('06/10/2026 · 09:00 – 11:00');
      await userEvent.click(appointment);
      expect(actions.onSelectEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    },
  );

  it.each(['day', 'week', 'month'] as const)(
    'opens all daily PRs even when the %s preview is full',
    async (viewMode) => {
      const githubEvents = Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        projectId: 1,
        projectName: 'Acerola',
        type: 'pr' as const,
        externalId: `#${index + 1}`,
        title: `PR do dia ${index + 1}`,
        description: null,
        url: null,
        author: 'ana',
        status: 'open' as const,
        eventDate: '2026-10-06T12:00:00Z',
        createdAt: '2026-10-06T12:00:00Z',
      }));
      const actions = renderView({
        data: {
          viewMode,
          githubEvents,
          days: [
            {
              dateString: '2026-10-06',
              dayNumber: 6,
              weekdayShort: 'Ter',
              isToday: true,
              isCurrentMonth: true,
              events: [],
              githubEvents,
            },
          ],
        },
      });
      await userEvent.click(screen.getByRole('button', { name: 'Ver 8 PRs do dia 06/10/2026' }));
      expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06');
    },
  );

  it('shows synchronized GitHub activity, productivity, and event tooltip', async () => {
    const githubEvent = {
      id: 41,
      projectId: 2,
      projectName: 'paralegal',
      type: 'pr' as const,
      externalId: '#41',
      title: 'Ajusta filtros do painel',
      description: null,
      url: 'https://github.com/grupo-azuos/paralegal/pull/41',
      author: 'vinicius-gpl',
      status: 'merged' as const,
      eventDate: '2026-10-06T12:00:00.000Z',
      createdAt: '2026-10-05T12:00:00.000Z',
    };

    const actions = renderView({
      data: {
        githubEvents: [githubEvent],
        mergedPullRequests: 1,
        resolvedIssues: 2,
        developerStats: [{ author: 'vinicius-gpl', mergedPullRequests: 1, resolvedIssues: 2 }],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [],
            githubEvents: [githubEvent],
          },
        ],
      },
    });

    const calendarEventLink = screen.getAllByRole('link', { name: /Ajusta filtros do painel/ })[0];
    expect(calendarEventLink).toBeInTheDocument();
    const hourCard = calendarEventLink?.closest('[data-slot="github-hour-event"]');
    const localTime = new Date(githubEvent.eventDate);
    const expectedTop = Math.round(
      (((localTime.getHours() - 8) * 60 + localTime.getMinutes()) * 56) / 60,
    );
    expect(hourCard).toHaveStyle({ top: `${expectedTop}px` });
    await userEvent.hover(calendarEventLink!);
    expect(await screen.findByText('Pull Request #41 · Mergeado')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('PRs mergeados no período')).toBeInTheDocument();
    expect(screen.getByText('Issues resolvidas no período')).toBeInTheDocument();
    expect(screen.getByText('vinicius-gpl')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ajusta filtros do painel/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 PR do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06');
  });

  it('shows a loading state before displaying the calendar', () => {
    renderView({ state: { isLoading: true } });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando cronograma');
    expect(screen.queryByText('Deploy da v1.4')).not.toBeInTheDocument();
  });

  it('keeps every monthly event accessible, including the fourth event', async () => {
    const events = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      title: `Agendamento ${index + 1}`,
      note: null,
      projectId: null,
      projectName: null,
      date: '2026-10-06',
      startTime: '09:00',
      endTime: '10:00',
      color: 'green' as const,
      category: 'deploy' as const,
      createdAt: '2026-10-01T00:00:00Z',
    }));
    const actions = renderView({
      data: {
        viewMode: 'month',
        events,
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events,
          },
        ],
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /Agendamento 4/ }));
    expect(actions.onSelectEvent).toHaveBeenCalledWith(events[3]);
  });

  it('keeps events outside business hours accessible', async () => {
    const event = {
      id: 8,
      title: 'Deploy noturno',
      note: null,
      projectId: null,
      projectName: null,
      date: '2026-10-06',
      startTime: '20:00',
      endTime: '21:00',
      color: 'green' as const,
      category: 'deploy' as const,
      createdAt: '2026-10-01T00:00:00Z',
    };
    const actions = renderView({
      data: {
        events: [event],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [event],
          },
        ],
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /Deploy noturno/ }));
    expect(actions.onSelectEvent).toHaveBeenCalledWith(event);
  });

  // feliz
  it('renders week grid header and scheduled event', () => {
    renderView();

    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Deploy da v1.4')).toBeInTheDocument();
    expect(screen.getByText(/09:00 – 11:00/)).toBeInTheDocument();
  });

  it('triggers onNewEvent when clicking Novo Agendamento', async () => {
    const actions = renderView();

    const newBtn = screen.getByRole('button', { name: /novo agendamento/i });
    await userEvent.click(newBtn);

    expect(actions.onNewEvent).toHaveBeenCalled();
  });

  it('triggers onSelectEvent when event block is clicked', async () => {
    const actions = renderView();

    const eventBlock = screen.getByText('Deploy da v1.4');
    await userEvent.click(eventBlock);

    expect(actions.onSelectEvent).toHaveBeenCalled();
  });

  // triste
  it('shows error state and allows retry', async () => {
    const actions = renderView({
      state: { error: 'Falha ao buscar agenda' },
    });

    expect(screen.getByText(/erro ao carregar o cronograma/i)).toBeInTheDocument();
    expect(screen.getByText('Falha ao buscar agenda')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /tentar de novo/i });
    await userEvent.click(retryButton);
    expect(actions.onRetry).toHaveBeenCalled();
  });
});
