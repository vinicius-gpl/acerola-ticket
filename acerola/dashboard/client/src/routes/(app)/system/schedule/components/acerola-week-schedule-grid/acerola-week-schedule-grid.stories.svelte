<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { DayColumn } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
  import { fn } from 'storybook/test';

  import WeekScheduleGrid from './acerola-week-schedule-grid.svelte';

  const mockEvents: SoftwareScheduleEvent[] = [
    {
      id: 1,
      title: 'Deploy da v1.4 em Produção',
      note: 'Publicação do release.',
      projectId: 1,
      projectName: 'Acerola Ticket',
      date: '2026-10-05',
      startTime: '09:00',
      endTime: '11:00',
      color: 'green',
      category: 'deploy',
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 2,
      title: 'Sprint Planning Semanal',
      note: 'Alinhamento dos objetivos.',
      projectId: null,
      projectName: null,
      date: '2026-10-06',
      startTime: '14:00',
      endTime: '16:00',
      color: 'blue',
      category: 'standup',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockDays: DayColumn[] = [
    {
      dateString: '2026-10-05',
      dayNumber: 5,
      weekdayShort: 'Seg',
      isToday: false,
      isCurrentMonth: true,
      events: [mockEvents[0]!],
    },
    {
      dateString: '2026-10-06',
      dayNumber: 6,
      weekdayShort: 'Ter',
      isToday: true,
      isCurrentMonth: true,
      events: [mockEvents[1]!],
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

  const baseData = {
    monthYearTitle: 'Outubro de 2026',
    viewMode: 'week' as const,
    days: mockDays,
    events: mockEvents,
    nowTopPx: 120,
  };

  const baseState = {
    isLoading: false,
    error: null,
  };

  const baseActions = {
    onPrev: fn(),
    onNext: fn(),
    onToday: fn(),
    onViewModeChange: fn(),
    onNewEvent: fn(),
    onSelectEvent: fn(),
    onRetry: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaWeekScheduleGrid',
    component: WeekScheduleGrid,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: baseData,
    state: baseState,
    actions: baseActions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { ...baseData, events: [] },
    state: { ...baseState, isLoading: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithError"
  args={{
    data: baseData,
    state: { ...baseState, error: 'Falha ao sincronizar agenda semanal.' },
    actions: baseActions,
  }}
/>
