<script lang="ts" module>
  import {
    type DayColumn,
    type ScheduleViewMode,
    type ScheduleFilterData,
  } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
  import { type StatusBadgeTone } from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
  import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';

  export type AcerolaWeekScheduleGridProps = {
    data: {
      monthYearTitle: string;
      viewMode: ScheduleViewMode;
      days: DayColumn[];
      events: SoftwareScheduleEvent[];
      githubEvents?: SoftwareTimelineEvent[];
      mergedPullRequests?: number;
      resolvedIssues?: number;
      developerStats?: {
        author: string;
        mergedPullRequests: number;
        resolvedIssues: number;
      }[];
      nowTopPx: number | null;
      filters?: ScheduleFilterData;
    };
    state: {
      canEdit?: boolean;
      isLoading: boolean;
      isRefetching?: boolean;
      error: string | null;
    };
    actions: {
      onPrev: () => void;
      onNext: () => void;
      onToday: () => void;
      onViewModeChange: (mode: ScheduleViewMode) => void;
      onNewEvent: () => void;
      onSelectEvent: (event: SoftwareScheduleEvent) => void;
      onRetry: () => void;
      onOpenGithubDay?: (date: string, type?: 'pr' | 'issue' | 'all') => void;
      onProjectFilterChange?: (value: string) => void;
      onAuthorFilterChange?: (value: string) => void;
      onTypeFilterChange?: (value: string) => void;
      onClearFilters?: () => void;
    };
  };

  /** Calcula a posição em pixels do bloco na grade de 08:00 às 18:00 (56px por hora). */
  function getEventStyle(event: SoftwareScheduleEvent): string {
    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);

    const startMinutes = Math.max(0, (startH ?? 8) * 60 + (startM ?? 0) - 480);
    const endMinutes = Math.min(600, (endH ?? 9) * 60 + (endM ?? 0) - 480);
    const durationMinutes = Math.max(5, endMinutes - startMinutes);

    const top = Math.round((startMinutes / 60) * 56);
    const height = Math.max(4, Math.round((durationMinutes / 60) * 56) - 4);

    return `top:${top}px;height:${height}px;`;
  }

  /** A cor escolhida no compromisso vira um dos 6 tons canônicos do sistema. */
  const COLOR_TONES: Record<string, StatusBadgeTone> = {
    blue: 'info',
    green: 'success',
    amber: 'warning',
    purple: 'brand',
    indigo: 'brand',
    rose: 'danger',
    red: 'danger',
    neutral: 'neutral',
  };

  /** Cartão inteiro tingido, com a borda fina em volta (nunca de um lado só). */
  const EVENT_SURFACE: Record<StatusBadgeTone, string> = {
    brand: 'border-primary/40 bg-primary-soft hover:border-primary/70',
    info: 'border-info/40 bg-info-soft hover:border-info/70',
    success: 'border-success/40 bg-success-soft hover:border-success/70',
    warning: 'border-warning/40 bg-warning-soft hover:border-warning/70',
    danger: 'border-destructive/40 bg-destructive-soft hover:border-destructive/70',
    neutral: 'border-border bg-card hover:border-border/80',
  };

  function toneOf(event: SoftwareScheduleEvent): StatusBadgeTone {
    return COLOR_TONES[event.color] ?? 'neutral';
  }
</script>

<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import GitMerge from '@lucide/svelte/icons/git-merge';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import Plus from '@lucide/svelte/icons/plus';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import * as Tooltip from '$lib/components/acerola-tooltip/acerola-tooltip';
  import GithubCalendarEvent from '../acerola-github-calendar-event/acerola-github-calendar-event.svelte';
  import {
    githubHourGroups,
    isWithinScheduleHours,
    overlapsGithubCard,
    GITHUB_HOUR_CARD_HEIGHT,
  } from '$lib/utils/github-calendar-layout.util';

  let { data, state: gridState, actions }: AcerolaWeekScheduleGridProps = $props();
  let newAppointmentTooltipOpen = $state(false);
  let filterTooltipOpen = $state<string | null>(null);

  const hours = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const PERIOD_LABELS: Record<ScheduleViewMode, { prev: string; next: string }> = {
    day: { prev: 'Dia anterior', next: 'Próximo dia' },
    week: { prev: 'Semana anterior', next: 'Próxima semana' },
    month: { prev: 'Mês anterior', next: 'Próximo mês' },
  };

  function timelineKind(event: SoftwareTimelineEvent): string {
    if (event.type === 'issue')
      return event.status === 'closed' ? 'Issue resolvida' : 'Issue aberta';
    if (event.status === 'merged') return 'PR mergeado';
    return event.status === 'closed' ? 'PR fechado' : 'PR aberto';
  }

  function timelineDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

{#snippet dayPullRequests(day: DayColumn)}
  {#each ['pr', 'issue'] as type (type)}
    {@const count = day.githubEvents?.filter((event) => event.type === type).length ?? 0}
    {@const noun = type === 'pr' ? (count === 1 ? 'PR' : 'PRs') : count === 1 ? 'issue' : 'issues'}
    {#if count > 0}
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}
            <button
              {...props}
              type="button"
              class="control-sm w-full rounded-control px-1 text-left text-xs font-medium text-primary hover:bg-primary-soft"
              aria-label="Ver {count} {noun} do dia {day.dateString.split('-').reverse().join('/')}"
              onclick={() =>
                type === 'pr'
                  ? actions.onOpenGithubDay?.(day.dateString)
                  : actions.onOpenGithubDay?.(day.dateString, 'issue')}
              >Ver {count} {noun} do dia</button
            >
          {/snippet}</Tooltip.Trigger
        ><Tooltip.Content
          >Ver {count}
          {noun} de {day.dateString.split('-').reverse().join('/')}, em ordem de horário</Tooltip.Content
        ></Tooltip.Root
      >
    {/if}
  {/each}
{/snippet}

<Tooltip.Provider>
  <section class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <!-- Toolbar: Mês/Ano, Navegação, Segmented Control e Botão Novo Evento -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-foreground">
          {data.monthYearTitle}
        </h1>
        <div class="flex items-center gap-1">
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="grid size-8 place-items-center rounded-control border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onclick={actions.onPrev}
                  aria-label={PERIOD_LABELS[data.viewMode].prev}
                >
                  <ChevronLeft class="size-4" />
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >{PERIOD_LABELS[data.viewMode].prev}</Tooltip.Content
            ></Tooltip.Root
          >
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  onclick={actions.onToday}
                >
                  Hoje
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >Voltar para a data de hoje</Tooltip.Content
            ></Tooltip.Root
          >
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="grid size-8 place-items-center rounded-control border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onclick={actions.onNext}
                  aria-label={PERIOD_LABELS[data.viewMode].next}
                >
                  <ChevronRight class="size-4" />
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >{PERIOD_LABELS[data.viewMode].next}</Tooltip.Content
            ></Tooltip.Root
          >
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Segmented Day / Week / Month -->
        <div class="flex rounded-control border border-border bg-muted/40 p-1">
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'day'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'}"
                  onclick={() => actions.onViewModeChange('day')}
                >
                  Dia
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >Mostrar a agenda de um dia</Tooltip.Content
            ></Tooltip.Root
          >
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'week'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'}"
                  onclick={() => actions.onViewModeChange('week')}
                >
                  Semana
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >Mostrar a agenda da semana</Tooltip.Content
            ></Tooltip.Root
          >
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'month'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'}"
                  onclick={() => actions.onViewModeChange('month')}
                >
                  Mês
                </button>
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content
              class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
              >Mostrar a agenda do mês</Tooltip.Content
            ></Tooltip.Root
          >
        </div>

        <Tooltip.Root bind:open={newAppointmentTooltipOpen}
          ><Tooltip.Trigger
            >{#snippet child({ props })}<span
                {...props}
                tabindex="-1"
                class="inline-flex"
                onfocusin={() => (newAppointmentTooltipOpen = true)}
                onfocusout={() => (newAppointmentTooltipOpen = false)}
                ><ActionButton
                  data={{ label: 'Novo agendamento' }}
                  ui={{ variant: 'primary', icon: Plus }}
                  state={{ isDisabled: gridState?.canEdit === false }}
                  actions={{ onClick: actions.onNewEvent }}
                /></span
              >{/snippet}</Tooltip.Trigger
          ><Tooltip.Content class="max-w-sm whitespace-normal"
            >Criar um agendamento na agenda de sistemas</Tooltip.Content
          ></Tooltip.Root
        >
      </div>
    </div>

    {#if data.filters}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="grid flex-1 grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          {#each [{ key: 'project', label: 'Projeto', hint: 'Filtrar agendamentos, PRs e issues por projeto', value: data.filters.project, options: data.filters.projectOptions, onChange: actions.onProjectFilterChange }, { key: 'author', label: 'Autor', hint: 'Filtrar PRs e issues pelo autor registrado no GitHub', value: data.filters.author, options: data.filters.authorOptions, onChange: actions.onAuthorFilterChange }, { key: 'type', label: 'Tipo', hint: 'Mostrar PRs, issues ou ambos na agenda', value: data.filters.type, options: [{ value: '', label: 'Todos' }, { value: 'pr', label: 'PRs' }, { value: 'issue', label: 'Issues' }], onChange: actions.onTypeFilterChange }] as filter (filter.key)}
            <div class="min-w-0 space-y-1.5 sm:min-w-40 sm:flex-1 sm:basis-48 sm:max-w-64">
              <span class="text-xs font-medium text-muted-foreground">{filter.label}</span>
              <Tooltip.Root
                open={filterTooltipOpen === filter.key}
                onOpenChange={(open) => (filterTooltipOpen = open ? filter.key : null)}
              >
                <Tooltip.Trigger
                  >{#snippet child({ props })}
                    <span
                      {...props}
                      tabindex="-1"
                      class="block min-w-0"
                      onfocusin={() => (filterTooltipOpen = filter.key)}
                      onfocusout={() => (filterTooltipOpen = null)}
                    >
                      <OptionPicker
                        data={{ value: filter.value, options: filter.options }}
                        ui={{
                          ariaLabel: `Filtrar por ${filter.label.toLowerCase()}`,
                          fullWidth: true,
                          mode: filter.key === 'type' ? 'auto' : 'combobox',
                          searchPlaceholder: `Buscar ${filter.label.toLowerCase()}…`,
                        }}
                        actions={{ onChange: (value) => filter.onChange?.(value) }}
                      />
                    </span>
                  {/snippet}</Tooltip.Trigger
                >
                <Tooltip.Content>{filter.hint}</Tooltip.Content>
              </Tooltip.Root>
            </div>
          {/each}
        </div>
        {#if data.filters.isActive}
          <Tooltip.Root
            ><Tooltip.Trigger
              >{#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class="control-lg self-start rounded-control px-3 text-xs font-medium text-primary hover:bg-primary-soft"
                  onclick={actions.onClearFilters}>Limpar filtros</button
                >
              {/snippet}</Tooltip.Trigger
            ><Tooltip.Content>Mostrar todos os projetos, autores, PRs e issues</Tooltip.Content
            ></Tooltip.Root
          >
        {/if}
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-3 sm:max-w-md">
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<button
              {...props}
              type="button"
              class="w-full text-left rounded-surface border border-border bg-card px-4 py-3"
            >
              <p class="text-xl font-semibold text-foreground">{data.mergedPullRequests ?? 0}</p>
              <p class="text-xs text-muted-foreground">PRs mergeados no período</p>
            </button>{/snippet}</Tooltip.Trigger
        ><Tooltip.Content class="max-w-sm whitespace-normal"
          >PRs mergeados nas datas exibidas no calendário. Cada PR conta no horário do merge.</Tooltip.Content
        ></Tooltip.Root
      >
      <Tooltip.Root
        ><Tooltip.Trigger
          >{#snippet child({ props })}<button
              {...props}
              type="button"
              class="w-full text-left rounded-surface border border-border bg-card px-4 py-3"
            >
              <p class="text-xl font-semibold text-foreground">{data.resolvedIssues ?? 0}</p>
              <p class="text-xs text-muted-foreground">Issues resolvidas no período</p>
            </button>{/snippet}</Tooltip.Trigger
        ><Tooltip.Content class="max-w-sm whitespace-normal"
          >Issues resolvidas nas datas exibidas no calendário. Cada issue conta no horário de
          fechamento.</Tooltip.Content
        ></Tooltip.Root
      >
    </div>

    {#if data.developerStats?.length}
      <div class="overflow-hidden rounded-surface border border-border bg-card shadow-xs">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-semibold text-foreground">Produtividade por desenvolvedor</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            PRs contam na data do merge e ficam com o autor; issues contam na data de fechamento e
            com quem fechou.
          </p>
        </div>
        <div class="divide-y divide-border">
          {#each data.developerStats as developer (developer.author)}
            <Tooltip.Root
              ><Tooltip.Trigger
                >{#snippet child({ props })}<button
                    {...props}
                    type="button"
                    class="w-full text-left grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3 text-xs"
                  >
                    <span class="truncate font-medium text-foreground">{developer.author}</span>
                    <span class="whitespace-nowrap text-muted-foreground"
                      >{developer.mergedPullRequests} PRs</span
                    >
                    <span class="whitespace-nowrap text-muted-foreground"
                      >{developer.resolvedIssues} issues</span
                    >
                  </button>{/snippet}</Tooltip.Trigger
              ><Tooltip.Content class="max-w-sm whitespace-normal"
                >{developer.author}: {developer.mergedPullRequests} PRs mergeados e {developer.resolvedIssues}
                issues resolvidas no período.</Tooltip.Content
              ></Tooltip.Root
            >
          {/each}
        </div>
      </div>
    {/if}

    {#if gridState.isLoading}
      <p
        role="status"
        class="rounded-surface border border-border p-8 text-center text-sm text-muted-foreground"
      >
        Carregando cronograma…
      </p>
    {:else if gridState.error}
      <ErrorState
        data={{
          title: 'Erro ao carregar o cronograma',
          message: gridState.error,
        }}
        actions={{ onRetry: actions.onRetry }}
      />
    {:else if data.viewMode === 'month'}
      <!-- Mês: calendário de 7 colunas, uma célula por dia, eventos empilhados -->
      <div class="overflow-x-auto rounded-surface border border-border bg-card shadow-xs">
        <div class="min-w-[840px]">
          <div class="grid grid-cols-7 border-b border-border">
            {#each WEEKDAY_HEADERS as weekday, index (weekday)}
              <Tooltip.Root
                ><Tooltip.Trigger
                  >{#snippet child({ props })}<button
                      {...props}
                      type="button"
                      class="px-3 py-2 text-center text-xs uppercase tracking-wider text-muted-foreground {index >
                      0
                        ? 'border-l border-border'
                        : ''}"
                    >
                      {weekday}
                    </button>{/snippet}</Tooltip.Trigger
                ><Tooltip.Content
                  >{[
                    'Segunda-feira',
                    'Terça-feira',
                    'Quarta-feira',
                    'Quinta-feira',
                    'Sexta-feira',
                    'Sábado',
                    'Domingo',
                  ][index]}</Tooltip.Content
                ></Tooltip.Root
              >
            {/each}
          </div>

          <div class="grid grid-cols-7">
            {#each data.days as day, index (day.dateString)}
              <div
                class="flex min-h-28 flex-col gap-1 border-border p-1.5 {index % 7 > 0
                  ? 'border-l'
                  : ''} {index >= 7 ? 'border-t' : ''} {day.isCurrentMonth ? '' : 'bg-muted/30'}"
              >
                {#if day.isToday}
                  <Tooltip.Root
                    ><Tooltip.Trigger
                      >{#snippet child({ props })}<button
                          {...props}
                          type="button"
                          class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                        >
                          {day.dayNumber}
                        </button>{/snippet}</Tooltip.Trigger
                    ><Tooltip.Content class="max-w-sm whitespace-normal"
                      >{day.weekdayShort}, {day.dateString.split('-').reverse().join('/')} · {day
                        .events.length} agendamentos · {day.githubEvents?.length ?? 0} atividades do GitHub</Tooltip.Content
                    ></Tooltip.Root
                  >
                {:else}
                  <Tooltip.Root
                    ><Tooltip.Trigger
                      >{#snippet child({ props })}<button
                          {...props}
                          type="button"
                          class="px-1 text-xs font-medium {day.isCurrentMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground'}"
                        >
                          {day.dayNumber}
                        </button>{/snippet}</Tooltip.Trigger
                    ><Tooltip.Content class="max-w-sm whitespace-normal"
                      >{day.weekdayShort}, {day.dateString.split('-').reverse().join('/')} · {day
                        .events.length} agendamentos · {day.githubEvents?.length ?? 0} atividades do GitHub</Tooltip.Content
                    ></Tooltip.Root
                  >
                {/if}

                {#if day.githubEvents?.length}
                  <div class="space-y-0.5">
                    {#each day.githubEvents.slice(0, 2) as event (event.id)}
                      <GithubCalendarEvent {event} compact />
                    {/each}
                    {#if day.githubEvents.length > 2}
                      <Tooltip.Root
                        ><Tooltip.Trigger
                          >{#snippet child({ props })}<button
                              {...props}
                              type="button"
                              class="block px-1 text-xs text-muted-foreground"
                            >
                              +{day.githubEvents!.length - 2} atividades
                            </button>{/snippet}</Tooltip.Trigger
                        ><Tooltip.Content class="max-w-sm whitespace-normal"
                          >Mais {day.githubEvents!.length - 2} atividades. Veja os PRs do dia ou o histórico
                          abaixo.</Tooltip.Content
                        ></Tooltip.Root
                      >
                    {/if}
                  </div>
                {/if}

                {#each day.events as event (event.id)}
                  <Tooltip.Root
                    ><Tooltip.Trigger
                      >{#snippet child({ props })}
                        <button
                          {...props}
                          type="button"
                          class="truncate rounded-chip border px-1.5 py-0.5 text-left text-xs font-medium text-foreground transition {EVENT_SURFACE[
                            toneOf(event)
                          ]}"
                          onclick={() => actions.onSelectEvent(event)}
                        >
                          {event.startTime}
                          {event.title}
                        </button>
                      {/snippet}</Tooltip.Trigger
                    ><Tooltip.Content
                      class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
                      ><span class="font-semibold">{event.title}</span>
                      <span
                        >{event.date.split('-').reverse().join('/')} · {event.startTime} – {event.endTime}</span
                      >
                      {#if event.projectName}<span>Projeto: {event.projectName}</span>{/if}
                      {#if event.note}<span>{event.note}</span>{/if}</Tooltip.Content
                    ></Tooltip.Root
                  >
                {/each}
                {@render dayPullRequests(day)}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- Dia e Semana: grade de horas com 1 ou 7 colunas -->
      {@const columns = data.days.length}
      <div class="overflow-x-auto rounded-surface border border-border bg-card shadow-xs">
        <div style="min-width:{columns === 1 ? 360 : 840}px">
          <!-- Header dos dias -->
          <div
            class="grid border-b border-border"
            style="grid-template-columns:56px repeat({columns},1fr)"
          >
            <div></div>
            {#each data.days as day (day.dateString)}
              <Tooltip.Root
                ><Tooltip.Trigger
                  >{#snippet child({ props })}<button
                      {...props}
                      type="button"
                      class="w-full text-left border-l border-border px-3 py-3 text-center"
                    >
                      <p class="text-xs uppercase tracking-wider text-muted-foreground">
                        {day.weekdayShort}
                      </p>
                      {#if day.isToday}
                        <p
                          class="mx-auto mt-1 grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                        >
                          {day.dayNumber}
                        </p>
                      {:else}
                        <p class="mt-1 text-xs font-medium text-foreground">
                          {day.dayNumber}
                        </p>
                      {/if}
                    </button>{/snippet}</Tooltip.Trigger
                ><Tooltip.Content class="max-w-sm whitespace-normal"
                  >{day.weekdayShort}, {day.dateString.split('-').reverse().join('/')} · {day.events
                    .length} agendamentos · {day.githubEvents?.length ?? 0} atividades do GitHub</Tooltip.Content
                ></Tooltip.Root
              >
            {/each}
          </div>

          <!-- Atividade do GitHub dentro da data correspondente, acima da grade horária. -->
          <div
            class="grid border-b border-border bg-muted/10"
            style="grid-template-columns:56px repeat({columns},1fr)"
          >
            <div
              class="flex items-start justify-end px-2 pt-2 text-xs font-medium text-muted-foreground"
            >
              GitHub
            </div>
            {#each data.days as day (day.dateString)}
              <div class="max-h-32 min-h-14 space-y-1 overflow-y-auto border-l border-border p-1.5">
                {#if !day.githubEvents?.length}
                  <span class="text-xs text-muted-foreground/60">—</span>
                {:else}
                  {#each day.githubEvents
                    .filter((event) => !isWithinScheduleHours(event))
                    .slice(0, 3) as event (event.id)}
                    <GithubCalendarEvent {event} />
                  {/each}
                  {@render dayPullRequests(day)}
                {/if}
              </div>
            {/each}
          </div>

          <!-- Grade de Horas (08:00 às 18:00) com Colunas e Eventos Absolutos -->
          <div class="relative grid" style="grid-template-columns:56px repeat({columns},1fr)">
            <div class="pb-14 text-right">
              {#each hours as hour (hour)}
                <Tooltip.Root
                  ><Tooltip.Trigger
                    >{#snippet child({ props })}<button
                        {...props}
                        type="button"
                        class="w-full text-left h-14 pr-2 pt-1 font-mono text-xs text-muted-foreground"
                      >
                        {hour}
                      </button>{/snippet}</Tooltip.Trigger
                  ><Tooltip.Content class="max-w-sm whitespace-normal"
                    >{hour} · Horário local da agenda</Tooltip.Content
                  ></Tooltip.Root
                >
              {/each}
            </div>

            {#each data.days as day (day.dateString)}
              {@const prGroups = githubHourGroups(day.githubEvents ?? [])}
              {@const timedEvents = day.events.filter(
                (event) => event.startTime < '18:00' && event.endTime > '08:00',
              )}
              <div
                class="relative border-l border-border {day.weekdayShort === 'Sáb' ||
                day.weekdayShort === 'Dom'
                  ? 'bg-muted/30'
                  : ''}"
              >
                <div
                  class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:100%_56px] opacity-40"
                ></div>

                {#each timedEvents as event (event.id)}
                  <Tooltip.Root
                    ><Tooltip.Trigger
                      >{#snippet child({ props })}
                        <button
                          {...props}
                          type="button"
                          class="absolute inset-x-1 overflow-hidden rounded-box border p-2 text-left shadow-xs transition {EVENT_SURFACE[
                            toneOf(event)
                          ]}"
                          style="{getEventStyle(event)}{prGroups.some((group) =>
                            overlapsGithubCard(event, group.top),
                          )
                            ? 'right:50%;'
                            : ''}"
                          onclick={() => actions.onSelectEvent(event)}
                        >
                          <p class="truncate text-xs font-semibold text-foreground">
                            {event.title}
                          </p>
                          <p class="truncate text-xs text-muted-foreground">
                            {event.startTime} – {event.endTime}
                          </p>
                          {#if event.projectName}
                            <p class="truncate text-xs text-muted-foreground opacity-80">
                              {event.projectName}
                            </p>
                          {/if}
                        </button>
                      {/snippet}</Tooltip.Trigger
                    ><Tooltip.Content
                      class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
                      ><span class="font-semibold">{event.title}</span>
                      <span
                        >{event.date.split('-').reverse().join('/')} · {event.startTime} – {event.endTime}</span
                      >
                      {#if event.projectName}<span>Projeto: {event.projectName}</span>{/if}
                      {#if event.note}<span>{event.note}</span>{/if}</Tooltip.Content
                    ></Tooltip.Root
                  >
                {/each}
                {#each prGroups as group (group.events[0]!.id)}
                  <div
                    data-slot="github-hour-event"
                    class="absolute inset-x-1 min-w-0"
                    style="top:{group.top}px;height:{GITHUB_HOUR_CARD_HEIGHT}px;{timedEvents.some(
                      (event) => overlapsGithubCard(event, group.top),
                    )
                      ? 'left:50%;'
                      : ''}"
                  >
                    {#if group.events.length === 1}
                      <GithubCalendarEvent event={group.events[0]!} inTimeGrid />
                    {:else}
                      <Tooltip.Root
                        ><Tooltip.Trigger
                          >{#snippet child({ props })}
                            <button
                              {...props}
                              type="button"
                              class="h-full w-full overflow-hidden rounded-box border border-primary/20 bg-primary-soft p-2 text-left text-xs text-primary hover:border-primary/50"
                              aria-label="Ver {group.events
                                .length} atividades próximas das {new Date(
                                group.events[0]!.eventDate,
                              ).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} do dia {day.dateString.split('-').reverse().join('/')}"
                              onclick={() => actions.onOpenGithubDay?.(day.dateString, 'all')}
                            >
                              <span class="block truncate font-semibold"
                                >{group.events.length} atividades · {group.events[0]!.title}</span
                              >
                              <span class="block truncate"
                                >{new Date(group.events[0]!.eventDate).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} · Ver atividades do dia</span
                              >
                            </button>
                          {/snippet}</Tooltip.Trigger
                        ><Tooltip.Content
                          class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
                          ><span class="font-semibold">Atividades próximas neste horário</span>
                          {#each group.events as pr (pr.id)}<span
                              >{timelineDate(pr.eventDate)} · {pr.type === 'issue' ? 'Issue' : 'PR'}
                              {pr.externalId} · {pr.title}</span
                            >{/each}
                          <span>Abrir todas as atividades do dia</span></Tooltip.Content
                        ></Tooltip.Root
                      >
                    {/if}
                  </div>
                {/each}
              </div>
            {/each}

            <!-- Linha de tempo atual ("Now line"): só aparece se hoje estiver na janela mostrada -->
            {#if data.nowTopPx !== null && data.days.some((d) => d.isToday)}
              <div
                class="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style="top:{data.nowTopPx}px"
              >
                <Tooltip.Root
                  ><Tooltip.Trigger
                    >{#snippet child({ props })}<button
                        {...props}
                        type="button"
                        aria-label="Horário atual"
                        class="pointer-events-auto ml-[52px] size-2 shrink-0 rounded-full bg-destructive"
                      ></button>{/snippet}</Tooltip.Trigger
                  ><Tooltip.Content>Horário atual na agenda</Tooltip.Content></Tooltip.Root
                >
                <span class="h-px flex-1 bg-destructive"></span>
              </div>
            {/if}
          </div>
        </div>
      </div>
      {#if data.events.some((event) => event.startTime < '08:00' || event.endTime > '18:00')}
        <div class="flex flex-col gap-2 rounded-surface border border-border bg-card p-4">
          <h2 class="text-sm font-semibold">Agendamentos fora do horário da grade</h2>
          {#each data.events.filter((event) => event.startTime < '08:00' || event.endTime > '18:00') as event (event.id)}
            <Tooltip.Root
              ><Tooltip.Trigger
                >{#snippet child({ props })}
                  <button
                    {...props}
                    type="button"
                    class="rounded-control border border-border p-2 text-left text-xs hover:bg-muted"
                    onclick={() => actions.onSelectEvent(event)}
                  >
                    {event.date.split('-').reverse().join('/')} · {event.startTime} – {event.endTime}
                    · {event.title}
                  </button>
                {/snippet}</Tooltip.Trigger
              ><Tooltip.Content
                class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
                ><span class="font-semibold">{event.title}</span>
                <span
                  >{event.date.split('-').reverse().join('/')} · {event.startTime} – {event.endTime}</span
                >
                {#if event.projectName}<span>Projeto: {event.projectName}</span>{/if}
                {#if event.note}<span>{event.note}</span>{/if}</Tooltip.Content
              ></Tooltip.Root
            >
          {/each}
        </div>
      {/if}
    {/if}

    <section class="rounded-surface border border-border bg-card p-4 shadow-xs">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-sm font-semibold text-foreground">Atividade do GitHub no período</h2>
        <p class="text-xs text-muted-foreground">
          PRs entram pela data de criação/merge; issues resolvidas, pela data de fechamento.
        </p>
      </div>
      {#if !data.githubEvents?.length}
        <p class="rounded-box bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          {#if data.filters?.isActive}Nenhuma atividade encontrada com os filtros atuais.
          {:else}Nenhuma atividade sincronizada neste período. Sincronize os projetos para carregar
            PRs e issues.{/if}
        </p>
      {:else}
        <div class="max-h-[32rem] space-y-4 overflow-y-auto pr-2">
          {#each data.days.filter((day) => day.githubEvents?.length) as day (day.dateString)}
            <div>
              <h3 class="mb-2 text-xs font-semibold text-muted-foreground">
                {day.weekdayShort}, {day.dateString.split('-').reverse().join('/')}
              </h3>
              <div class="space-y-2">
                {#each day.githubEvents ?? [] as event (event.id)}
                  <Tooltip.Root
                    ><Tooltip.Trigger
                      >{#snippet child({ props })}<a
                          {...props}
                          href={event.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          class="flex min-w-0 items-center gap-3 rounded-box border border-border bg-muted/20 p-3 transition hover:border-primary/40 hover:bg-muted/40"
                        >
                          <span
                            class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                          >
                            {#if event.type === 'issue'}
                              <LifeBuoy class="size-4" />
                            {:else if event.status === 'merged'}
                              <GitMerge class="size-4" />
                            {:else}
                              <GitPullRequest class="size-4" />
                            {/if}
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-xs font-semibold text-foreground">
                              {event.title}
                            </span>
                            <span class="block truncate text-xs text-muted-foreground">
                              {event.projectName ?? 'Projeto'} · {timelineKind(event)} · por {event.authorName ??
                                event.author ??
                                'desconhecido'}
                            </span>
                          </span>
                          <span class="shrink-0 text-xs text-muted-foreground">
                            {timelineDate(event.eventDate)}
                          </span>
                        </a>{/snippet}</Tooltip.Trigger
                    >
                    <Tooltip.Content
                      class="max-h-64 max-w-sm flex-col items-start gap-1 overflow-y-auto whitespace-normal"
                    >
                      <span class="font-semibold">{event.externalId} · {event.title}</span>
                      <span>{timelineKind(event)} · {timelineDate(event.eventDate)}</span>
                      <span
                        >{event.projectName ?? 'Projeto'} · por {event.authorName ??
                          event.author ??
                          'desconhecido'}</span
                      >
                    </Tooltip.Content></Tooltip.Root
                  >
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </section>
</Tooltip.Provider>
