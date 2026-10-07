import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { softwareScheduleApi } from '$lib/api/software-schedule.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type ScheduleViewMode = 'day' | 'week' | 'month';

export type DayColumn = {
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  weekdayShort: string; // Seg, Ter, Qua...
  isToday: boolean;
  /** Na visão de mês, os dias de fora do mês exibido aparecem esmaecidos. */
  isCurrentMonth: boolean;
  events: SoftwareScheduleEvent[];
};

export type SoftwareScheduleModel = {
  data: {
    monthYearTitle: string;
    viewMode: ScheduleViewMode;
    days: DayColumn[];
    events: SoftwareScheduleEvent[];
    projects: SoftwareProject[];
    nowTopPx: number | null; // Posição em pixels da linha vermelha 'agora' (null se fora das 08h-18h ou outro dia)
    currentDate: Date;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    error: string | null;
  };
  actions: {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: ScheduleViewMode) => void;
    onRetry: () => void;
    onDeleteEvent: (id: number) => void;
  };
};

export const SOFTWARE_SCHEDULE_QUERY_KEY = ['software-schedule'] as const;

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Pega a segunda-feira da semana de uma data. */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, amount: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Soma meses sem estourar o dia (31 de jan + 1 mês = 28/29 de fev, não 3 de mar). */
function addMonths(d: Date, amount: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth() + amount, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(d.getDate(), lastDay));
  return next;
}

/** A janela de datas que a visão mostra: 1 dia, a semana, ou a grade do mês (segunda a domingo). */
function visibleRange(current: Date, mode: ScheduleViewMode): { start: Date; end: Date } {
  if (mode === 'day') {
    const day = new Date(current);
    day.setHours(0, 0, 0, 0);
    return { start: day, end: day };
  }

  if (mode === 'week') {
    const monday = getMonday(current);
    return { start: monday, end: addDays(monday, 6) };
  }

  const first = new Date(current.getFullYear(), current.getMonth(), 1);
  const last = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const start = getMonday(first);
  const lastMonday = getMonday(last);
  return { start, end: addDays(lastMonday, 6) };
}

export function useSoftwareScheduleModel(): SoftwareScheduleModel {
  const queryClient = useQueryClient();
  const currentDate = writable<Date>(new Date());
  const viewMode = writable<ScheduleViewMode>('week');

  const range = derived([currentDate, viewMode], ([$current, $mode]) => {
    const { start, end } = visibleRange($current, $mode);
    return { startDate: formatDateIso(start), endDate: formatDateIso(end) };
  });

  const query = mirrorStore(
    createQuery(
      derived(range, ($range) => ({
        queryKey: [...SOFTWARE_SCHEDULE_QUERY_KEY, $range.startDate, $range.endDate],
        queryFn: () => softwareScheduleApi.list($range),
      })),
    ),
  );

  const projectsQuery = mirrorStore(
    createQuery(
      writable({
        queryKey: ['software-projects', 'all'],
        queryFn: () => softwareProjectsApi.list({ page: 1, pageSize: 100 }),
      }),
    ),
  );

  const deleteMutation = mirrorStore(
    createMutation({
      mutationFn: (id: number) => softwareScheduleApi.remove(id),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_SCHEDULE_QUERY_KEY });
      },
    }),
  );

  const currentDateStore = mirrorStore(currentDate);
  const viewModeStore = mirrorStore(viewMode);

  return {
    get data() {
      const cur = currentDateStore.current;
      const mode = viewModeStore.current;
      const todayIso = formatDateIso(new Date());
      const allEvents = query.current.data ?? [];
      const projects = projectsQuery.current.data?.items ?? [];

      const { start, end } = visibleRange(cur, mode);
      const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

      const days: DayColumn[] = [];
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(start, i);
        const dateString = formatDateIso(d);
        const weekdayIndex = (d.getDay() + 6) % 7;

        days.push({
          dateString,
          dayNumber: d.getDate(),
          weekdayShort: WEEKDAYS[weekdayIndex] ?? '',
          isToday: dateString === todayIso,
          isCurrentMonth: d.getMonth() === cur.getMonth(),
          events: allEvents
            .filter((e) => e.date === dateString)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        });
      }

      const monthName = MONTHS_PT[cur.getMonth()] ?? '';
      const monthYearTitle =
        mode === 'day'
          ? `${cur.getDate()} de ${monthName} ${cur.getFullYear()}`
          : `${monthName} ${cur.getFullYear()}`;

      // Calcula posição da linha vermelha "Agora"
      const now = new Date();
      const nowHour = now.getHours();
      const nowMinutes = now.getMinutes();
      let nowTopPx: number | null = null;
      if (nowHour >= 8 && nowHour < 18) {
        // Cada hora tem 56px (h-14). 8:00 é 0px.
        const totalMinutesFrom8 = (nowHour - 8) * 60 + nowMinutes;
        nowTopPx = Math.round((totalMinutesFrom8 / 60) * 56);
      }

      return {
        monthYearTitle,
        viewMode: mode,
        days,
        events: allEvents,
        projects,
        nowTopPx,
        currentDate: cur,
      };
    },
    get state() {
      return {
        isLoading: query.current.isPending,
        isRefetching: query.current.isRefetching,
        error: readError(query.current.error),
      };
    },
    actions: {
      onPrev: () => {
        const mode = viewModeStore.current;
        currentDate.update((d) =>
          mode === 'day' ? addDays(d, -1) : mode === 'week' ? addDays(d, -7) : addMonths(d, -1),
        );
      },
      onNext: () => {
        const mode = viewModeStore.current;
        currentDate.update((d) =>
          mode === 'day' ? addDays(d, 1) : mode === 'week' ? addDays(d, 7) : addMonths(d, 1),
        );
      },
      onToday: () => {
        currentDate.set(new Date());
      },
      onViewModeChange: (mode) => viewMode.set(mode),
      onRetry: () => void query.current.refetch(),
      onDeleteEvent: (id) => void deleteMutation.current.mutate(id),
    },
  };
}
