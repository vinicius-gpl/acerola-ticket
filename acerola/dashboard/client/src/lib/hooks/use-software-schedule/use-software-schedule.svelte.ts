import { SvelteDate, SvelteMap } from 'svelte/reactivity';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { softwareScheduleApi } from '$lib/api/software-schedule.api';
import { softwareTimelineApi } from '$lib/api/software-timeline.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type ScheduleViewMode = 'day' | 'week' | 'month';

/** A visão com que o cronograma abre. */
export const DEFAULT_SCHEDULE_VIEW_MODE: ScheduleViewMode = 'month';

export type DeveloperActivitySummary = {
  author: string;
  mergedPullRequests: number;
  resolvedIssues: number;
};

export type ScheduleFilters = { project: string; author: string; type: string };
export type ScheduleFilterData = ScheduleFilters & {
  projectOptions: { value: string; label: string }[];
  authorOptions: { value: string; label: string }[];
  isActive: boolean;
};

function filterGithubEvents(events: SoftwareTimelineEvent[], filters: ScheduleFilters) {
  return events.filter(
    (event) =>
      (!filters.project || String(event.projectId) === filters.project) &&
      (!filters.author || (event.author ?? '__unknown__') === filters.author) &&
      (!filters.type || event.type === filters.type),
  );
}

function projectFilterOptions(
  projects: SoftwareProject[],
  events: SoftwareScheduleEvent[],
  githubEvents: SoftwareTimelineEvent[],
) {
  const projectOptions = new SvelteMap(
    projects.map((project) => [String(project.id), project.name]),
  );
  for (const event of [...events, ...githubEvents]) {
    if (event.projectId != null)
      projectOptions.set(
        String(event.projectId),
        event.projectName ??
          projectOptions.get(String(event.projectId)) ??
          `Projeto ${event.projectId}`,
      );
  }

  return [
    { value: '', label: 'Todos os projetos' },
    ...[...projectOptions]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
}

function authorFilterOptions(githubEvents: SoftwareTimelineEvent[], selectedAuthor: string) {
  const authors = new SvelteMap<string, string>();
  for (const event of githubEvents) {
    const login = event.author ?? '__unknown__';
    authors.set(login, event.authorName || (login === '__unknown__' ? 'Não informado' : login));
  }
  if (selectedAuthor && !authors.has(selectedAuthor)) authors.set(selectedAuthor, selectedAuthor);
  return [
    { value: '', label: 'Todos os autores' },
    ...[...authors]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ];
}

function scheduleFilterData(
  filters: ScheduleFilters,
  githubEvents: SoftwareTimelineEvent[],
  projects: SoftwareProject[],
  events: SoftwareScheduleEvent[],
): ScheduleFilterData {
  return {
    ...filters,
    isActive: Boolean(filters.project || filters.author || filters.type),
    projectOptions: projectFilterOptions(projects, events, githubEvents),
    authorOptions: authorFilterOptions(githubEvents, filters.author),
  };
}

export type DayColumn = {
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  weekdayShort: string; // Seg, Ter, Qua...
  isToday: boolean;
  /** Na visão de mês, os dias de fora do mês exibido aparecem esmaecidos. */
  isCurrentMonth: boolean;
  events: SoftwareScheduleEvent[];
  githubEvents?: SoftwareTimelineEvent[];
};

export type SoftwareScheduleModel = {
  data: {
    monthYearTitle: string;
    viewMode: ScheduleViewMode;
    days: DayColumn[];
    events: SoftwareScheduleEvent[];
    githubEvents: SoftwareTimelineEvent[];
    mergedPullRequests: number;
    resolvedIssues: number;
    developerStats: DeveloperActivitySummary[];
    projects: SoftwareProject[];
    nowTopPx: number | null; // Posição em pixels da linha vermelha 'agora' (null se fora das 08h-18h ou outro dia)
    currentDate: Date;
    filters: ScheduleFilterData;
    githubDay: {
      date: string;
      type?: 'pr' | 'issue' | 'all';
      items: SoftwareTimelineEvent[];
      total: number;
      page: number;
      pageSize: number;
    } | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    error: string | null;
    deleteError: string | null;
    isDeleting: boolean;
  };
  actions: {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: ScheduleViewMode) => void;
    onRetry: () => void;
    onDeleteEvent: (id: number) => Promise<boolean>;
    onOpenGithubDay: (date: string, type?: 'pr' | 'issue' | 'all') => void;
    onCloseGithubDay: () => void;
    onGithubDayPageChange: (page: number) => void;
    onProjectFilterChange: (value: string) => void;
    onAuthorFilterChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
    onClearFilters: () => void;
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
const TIMELINE_PAGE_SIZE = 200;

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Pega a segunda-feira da semana de uma data. */
function getMonday(d: Date): Date {
  const date = new SvelteDate(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, amount: number): Date {
  const next = new SvelteDate(d);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Soma meses sem estourar o dia (31 de jan + 1 mês = 28/29 de fev, não 3 de mar). */
function addMonths(d: Date, amount: number): Date {
  const next = new SvelteDate(d.getFullYear(), d.getMonth() + amount, 1);
  const lastDay = new SvelteDate(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(d.getDate(), lastDay));
  return next;
}

/** A janela de datas que a visão mostra: 1 dia, a semana, ou a grade do mês (segunda a domingo). */
function visibleRange(current: Date, mode: ScheduleViewMode): { start: Date; end: Date } {
  if (mode === 'day') {
    const day = new SvelteDate(current);
    day.setHours(0, 0, 0, 0);
    return { start: day, end: day };
  }

  if (mode === 'week') {
    const monday = getMonday(current);
    return { start: monday, end: addDays(monday, 6) };
  }

  const first = new SvelteDate(current.getFullYear(), current.getMonth(), 1);
  const last = new SvelteDate(current.getFullYear(), current.getMonth() + 1, 0);
  const start = getMonday(first);
  const lastMonday = getMonday(last);
  return { start, end: addDays(lastMonday, 6) };
}

function countGithubEvents(
  events: SoftwareTimelineEvent[],
  type: SoftwareTimelineEvent['type'],
  status: SoftwareTimelineEvent['status'],
): number {
  return events.filter((event) => event.type === type && event.status === status).length;
}

function developerActivityKind(event: SoftwareTimelineEvent): 'pr' | 'issue' | null {
  if (event.type === 'pr' && event.status === 'merged') return 'pr';
  if (event.type === 'issue' && event.status === 'closed') return 'issue';
  return null;
}

function summarizeDeveloperActivity(
  githubEvents: SoftwareTimelineEvent[],
): DeveloperActivitySummary[] {
  const activityByDeveloper = new SvelteMap<string, DeveloperActivitySummary>();
  for (const event of githubEvents) {
    const kind = developerActivityKind(event);
    if (!kind) continue;

    const authorKey = event.author ?? 'desconhecido';
    const summary = activityByDeveloper.get(authorKey) ?? {
      author: event.authorName || authorKey,
      mergedPullRequests: 0,
      resolvedIssues: 0,
    };
    if (kind === 'pr') summary.mergedPullRequests++;
    else summary.resolvedIssues++;
    activityByDeveloper.set(authorKey, summary);
  }
  const developerStats = [...activityByDeveloper.values()].sort(
    (a, b) =>
      b.mergedPullRequests + b.resolvedIssues - (a.mergedPullRequests + a.resolvedIssues) ||
      a.author.localeCompare(b.author),
  );

  return developerStats;
}

function currentTimePosition(): number | null {
  // Calcula posição da linha vermelha "Agora"
  const now = new SvelteDate();
  const nowHour = now.getHours();
  const nowMinutes = now.getMinutes();
  let nowTopPx: number | null = null;
  if (nowHour >= 8 && nowHour < 18) {
    // Cada hora tem 56px (h-14). 8:00 é 0px.
    const totalMinutesFrom8 = (nowHour - 8) * 60 + nowMinutes;
    nowTopPx = Math.round((totalMinutesFrom8 / 60) * 56);
  }

  return nowTopPx;
}

function selectedGithubDay(
  days: DayColumn[],
  date: string | null,
  page: number,
  pageSize: number,
  type: 'pr' | 'issue' | 'all',
): SoftwareScheduleModel['data']['githubDay'] {
  if (!date) return null;
  const prs =
    days
      .find((day) => day.dateString === date)
      ?.githubEvents?.filter((event) => type === 'all' || event.type === type) ?? [];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(prs.length / pageSize)));
  return {
    date,
    type,
    items: prs.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    total: prs.length,
    page: currentPage,
    pageSize,
  };
}

type CalendarInput = {
  current: Date;
  mode: ScheduleViewMode;
  rawEvents: SoftwareScheduleEvent[];
  rawGithubEvents: SoftwareTimelineEvent[];
  projects: SoftwareProject[];
  filters: ScheduleFilters;
};

/** Os eventos do GitHub agrupados pelo dia local — uma passada só, em vez de filtrar por dia. */
function groupGithubByDay(events: SoftwareTimelineEvent[]): Map<string, SoftwareTimelineEvent[]> {
  const byDay = new SvelteMap<string, SoftwareTimelineEvent[]>();
  for (const event of events) {
    const day = formatDateIso(new Date(event.eventDate));
    const list = byDay.get(day);
    if (list) list.push(event);
    else byDay.set(day, [event]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate) || a.id - b.id);
  }
  return byDay;
}

function buildDays(
  current: Date,
  mode: ScheduleViewMode,
  events: SoftwareScheduleEvent[],
  githubEvents: SoftwareTimelineEvent[],
): DayColumn[] {
  const todayIso = formatDateIso(new Date());
  const githubByDay = groupGithubByDay(githubEvents);
  const { start, end } = visibleRange(current, mode);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const days: DayColumn[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    const dateString = formatDateIso(d);
    days.push({
      dateString,
      dayNumber: d.getDate(),
      weekdayShort: WEEKDAYS[(d.getDay() + 6) % 7] ?? '',
      isToday: dateString === todayIso,
      isCurrentMonth: d.getMonth() === current.getMonth(),
      events: events
        .filter((e) => e.date === dateString)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      githubEvents: githubByDay.get(dateString) ?? [],
    });
  }
  return days;
}

function buildCalendar(input: CalendarInput): Omit<SoftwareScheduleModel['data'], 'githubDay'> {
  const { current, mode, rawEvents, rawGithubEvents, projects, filters } = input;
  const events = rawEvents.filter(
    (event) => !filters.project || String(event.projectId) === filters.project,
  );
  const githubEvents = filterGithubEvents(rawGithubEvents, filters);
  const monthName = MONTHS_PT[current.getMonth()] ?? '';

  return {
    monthYearTitle:
      mode === 'day'
        ? `${current.getDate()} de ${monthName} ${current.getFullYear()}`
        : `${monthName} ${current.getFullYear()}`,
    viewMode: mode,
    days: buildDays(current, mode, events, githubEvents),
    events,
    githubEvents,
    mergedPullRequests: countGithubEvents(githubEvents, 'pr', 'merged'),
    resolvedIssues: countGithubEvents(githubEvents, 'issue', 'closed'),
    developerStats: summarizeDeveloperActivity(githubEvents),
    projects,
    nowTopPx: currentTimePosition(),
    currentDate: current,
    filters: scheduleFilterData(filters, rawGithubEvents, projects, rawEvents),
  };
}

export function useSoftwareScheduleModel(): SoftwareScheduleModel {
  const queryClient = useQueryClient();
  const currentDate = writable<Date>(new SvelteDate());
  /* Abre no mês: é a visão que a equipe usa para planejar; semana e dia ficam a um clique. */
  const viewMode = writable<ScheduleViewMode>(DEFAULT_SCHEDULE_VIEW_MODE);
  let githubDayDate = $state<string | null>(null);
  let githubDayType = $state<'pr' | 'issue' | 'all'>('pr');
  let filters = $state<ScheduleFilters>({ project: '', author: '', type: '' });
  let githubDayPage = $state(1);
  const githubDayPageSize = 5;

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

  const githubQuery = mirrorStore(
    createQuery(
      derived(range, ($range) => ({
        queryKey: ['software-timeline', 'schedule', $range.startDate, $range.endDate],
        queryFn: async () => {
          const startAt = new SvelteDate(`${$range.startDate}T00:00:00`);
          const endBefore = new SvelteDate(`${$range.endDate}T00:00:00`);
          endBefore.setDate(endBefore.getDate() + 1);
          const filters = {
            startAt: startAt.toISOString(),
            endBefore: endBefore.toISOString(),
            pageSize: TIMELINE_PAGE_SIZE,
          };
          const firstPage = await softwareTimelineApi.list({ ...filters, page: 1 });
          const pageCount = Math.ceil(firstPage.total / TIMELINE_PAGE_SIZE);
          if (pageCount <= 1) return firstPage.items;

          const remainingPages = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              softwareTimelineApi.list({ ...filters, page: index + 2 }),
            ),
          );
          return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
        },
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

  /*
   * O calendário (dias, filtros, contagens) é calculado UMA vez e guardado: só refaz quando o
   * período, a visão, os dados ou os filtros mudam. Antes ele era remontado a cada leitura —
   * inclusive ao abrir a janela de um dia, que repintava a grade inteira e travava a tela por
   * segundos num dia com dezenas de PRs.
   */
  const calendar = $derived.by(() =>
    buildCalendar({
      current: currentDateStore.current,
      mode: viewModeStore.current,
      rawEvents: query.current.data ?? [],
      rawGithubEvents: githubQuery.current.data ?? [],
      projects: projectsQuery.current.data?.items ?? [],
      filters,
    }),
  );

  /* A janela do dia depende só do dia aberto e da página — e do calendário, que não muda ao abri-la. */
  const githubDay = $derived(
    selectedGithubDay(calendar.days, githubDayDate, githubDayPage, githubDayPageSize, githubDayType),
  );

  /* Objeto estável, com cada campo lido na hora: quem lê `data.days` não é avisado quando só a
     janela do dia (`data.githubDay`) mudou. */
  const data: SoftwareScheduleModel['data'] = {
    get monthYearTitle() {
      return calendar.monthYearTitle;
    },
    get viewMode() {
      return calendar.viewMode;
    },
    get days() {
      return calendar.days;
    },
    get events() {
      return calendar.events;
    },
    get githubEvents() {
      return calendar.githubEvents;
    },
    get mergedPullRequests() {
      return calendar.mergedPullRequests;
    },
    get resolvedIssues() {
      return calendar.resolvedIssues;
    },
    get developerStats() {
      return calendar.developerStats;
    },
    get projects() {
      return calendar.projects;
    },
    get nowTopPx() {
      return calendar.nowTopPx;
    },
    get currentDate() {
      return calendar.currentDate;
    },
    get filters() {
      return calendar.filters;
    },
    get githubDay() {
      return githubDay;
    },
  };

  return {
    get data() {
      return data;
    },
    get state() {
      return {
        isLoading: query.current.isPending || githubQuery.current.isPending,
        isRefetching: query.current.isRefetching || githubQuery.current.isRefetching,
        error:
          readError(query.current.error) ??
          readError(githubQuery.current.error) ??
          readError(projectsQuery.current.error),
        deleteError: readError(deleteMutation.current.error),
        isDeleting: deleteMutation.current.isPending,
      };
    },
    actions: {
      onProjectFilterChange: (value) => {
        filters.project = value;
        githubDayPage = 1;
      },
      onAuthorFilterChange: (value) => {
        filters.author = value;
        githubDayPage = 1;
      },
      onTypeFilterChange: (value) => {
        filters.type = value === 'pr' || value === 'issue' ? value : '';
        githubDayPage = 1;
      },
      onClearFilters: () => {
        filters = { project: '', author: '', type: '' };
        githubDayPage = 1;
      },
      onOpenGithubDay: (date, type = 'pr') => {
        githubDayDate = date;
        githubDayType = type;
        githubDayPage = 1;
      },
      onCloseGithubDay: () => {
        githubDayDate = null;
      },
      onGithubDayPageChange: (nextPage) => {
        githubDayPage = Math.max(1, nextPage);
      },
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
        currentDate.set(new SvelteDate());
      },
      onViewModeChange: (mode) => viewMode.set(mode),
      onRetry: () => {
        void query.current.refetch();
        void githubQuery.current.refetch();
        void projectsQuery.current.refetch();
      },
      onDeleteEvent: async (id) => {
        if (deleteMutation.current.isPending) return false;
        try {
          await deleteMutation.current.mutateAsync(id);
          return true;
        } catch {
          return false;
        }
      },
    },
  };
}
