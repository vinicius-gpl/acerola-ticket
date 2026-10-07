import { render, screen } from '@testing-library/svelte';
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
