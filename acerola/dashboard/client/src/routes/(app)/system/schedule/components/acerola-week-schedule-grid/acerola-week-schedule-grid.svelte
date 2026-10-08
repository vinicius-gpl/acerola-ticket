<script lang="ts" module>
  import {
    type DayColumn,
    type ScheduleViewMode,
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
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import GithubCalendarEvent from '../acerola-github-calendar-event/acerola-github-calendar-event.svelte';

  let { data, state, actions }: AcerolaWeekScheduleGridProps = $props();

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

<Tooltip.Provider>
  <section class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <!-- Toolbar: Mês/Ano, Navegação, Segmented Control e Botão Novo Evento -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-foreground">
          {data.monthYearTitle}
        </h1>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-control border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onclick={actions.onPrev}
            title={PERIOD_LABELS[data.viewMode].prev}
          >
            <ChevronLeft class="size-4" />
          </button>
          <button
            type="button"
            class="rounded-control border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            onclick={actions.onToday}
          >
            Hoje
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-control border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onclick={actions.onNext}
            title={PERIOD_LABELS[data.viewMode].next}
          >
            <ChevronRight class="size-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Segmented Day / Week / Month -->
        <div class="flex rounded-control border border-border bg-muted/40 p-1">
          <button
            type="button"
            class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'day'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => actions.onViewModeChange('day')}
          >
            Dia
          </button>
          <button
            type="button"
            class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'week'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => actions.onViewModeChange('week')}
          >
            Semana
          </button>
          <button
            type="button"
            class="rounded-chip px-3 py-1.5 text-xs font-medium {data.viewMode === 'month'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => actions.onViewModeChange('month')}
          >
            Mês
          </button>
        </div>

        <ActionButton
          data={{ label: 'Novo agendamento' }}
          ui={{ variant: 'primary', icon: Plus }}
          state={{ isDisabled: state?.canEdit === false }}
          actions={{ onClick: actions.onNewEvent }}
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:max-w-md">
      <div class="rounded-surface border border-border bg-card px-4 py-3">
        <p class="text-xl font-semibold text-foreground">{data.mergedPullRequests ?? 0}</p>
        <p class="text-xs text-muted-foreground">PRs mergeados no período</p>
      </div>
      <div class="rounded-surface border border-border bg-card px-4 py-3">
        <p class="text-xl font-semibold text-foreground">{data.resolvedIssues ?? 0}</p>
        <p class="text-xs text-muted-foreground">Issues resolvidas no período</p>
      </div>
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
          {#each data.developerStats as developer}
            <div
              class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3 text-xs"
            >
              <span class="truncate font-medium text-foreground">{developer.author}</span>
              <span class="whitespace-nowrap text-muted-foreground"
                >{developer.mergedPullRequests} PRs</span
              >
              <span class="whitespace-nowrap text-muted-foreground"
                >{developer.resolvedIssues} issues</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if state.isLoading}
      <p
        role="status"
        class="rounded-surface border border-border p-8 text-center text-sm text-muted-foreground"
      >
        Carregando cronograma…
      </p>
    {:else if state.error}
      <ErrorState
        data={{
          title: 'Erro ao carregar o cronograma',
          message: state.error,
        }}
        actions={{ onRetry: actions.onRetry }}
      />
    {:else if data.viewMode === 'month'}
      <!-- Mês: calendário de 7 colunas, uma célula por dia, eventos empilhados -->
      <div class="overflow-x-auto rounded-surface border border-border bg-card shadow-xs">
        <div class="min-w-[840px]">
          <div class="grid grid-cols-7 border-b border-border">
            {#each WEEKDAY_HEADERS as weekday, index}
              <p
                class="px-3 py-2 text-center text-xs uppercase tracking-wider text-muted-foreground {index >
                0
                  ? 'border-l border-border'
                  : ''}"
              >
                {weekday}
              </p>
            {/each}
          </div>

          <div class="grid grid-cols-7">
            {#each data.days as day, index}
              <div
                class="flex min-h-28 flex-col gap-1 border-border p-1.5 {index % 7 > 0
                  ? 'border-l'
                  : ''} {index >= 7 ? 'border-t' : ''} {day.isCurrentMonth ? '' : 'bg-muted/30'}"
              >
                {#if day.isToday}
                  <span
                    class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  >
                    {day.dayNumber}
                  </span>
                {:else}
                  <span
                    class="px-1 text-xs font-medium {day.isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground'}"
                  >
                    {day.dayNumber}
                  </span>
                {/if}

                {#if day.githubEvents?.length}
                  <div class="space-y-0.5">
                    {#each day.githubEvents.slice(0, 2) as event}
                      <GithubCalendarEvent {event} compact />
                    {/each}
                    {#if day.githubEvents.length > 2}
                      <span class="block px-1 text-[10px] text-muted-foreground">
                        +{day.githubEvents.length - 2} atividades
                      </span>
                    {/if}
                  </div>
                {/if}

                {#each day.events as event}
                  <button
                    type="button"
                    class="truncate rounded-chip border px-1.5 py-0.5 text-left text-xs font-medium text-foreground transition {EVENT_SURFACE[
                      toneOf(event)
                    ]}"
                    onclick={() => actions.onSelectEvent(event)}
                    title="{event.startTime} – {event.title}"
                  >
                    {event.startTime}
                    {event.title}
                  </button>
                {/each}
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
            {#each data.days as day}
              <div class="border-l border-border px-3 py-3 text-center">
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
              </div>
            {/each}
          </div>

          <!-- Atividade do GitHub dentro da data correspondente, acima da grade horária. -->
          <div
            class="grid border-b border-border bg-muted/10"
            style="grid-template-columns:56px repeat({columns},1fr)"
          >
            <div
              class="flex items-start justify-end px-2 pt-2 text-[10px] font-medium text-muted-foreground"
            >
              GitHub
            </div>
            {#each data.days as day}
              <div class="max-h-32 min-h-14 space-y-1 overflow-y-auto border-l border-border p-1.5">
                {#if !day.githubEvents?.length}
                  <span class="text-[10px] text-muted-foreground/60">—</span>
                {:else}
                  {#each day.githubEvents.slice(0, 3) as event}
                    <GithubCalendarEvent {event} />
                  {/each}
                  {#if day.githubEvents.length > 3}
                    <span class="block px-1 text-[10px] text-muted-foreground">
                      +{day.githubEvents.length - 3} no histórico abaixo
                    </span>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>

          <!-- Grade de Horas (08:00 às 18:00) com Colunas e Eventos Absolutos -->
          <div class="relative grid" style="grid-template-columns:56px repeat({columns},1fr)">
            <div class="text-right">
              {#each hours as hour}
                <div class="h-14 pr-2 pt-1 font-mono text-xs text-muted-foreground">
                  {hour}
                </div>
              {/each}
            </div>

            {#each data.days as day}
              <div
                class="relative border-l border-border {day.weekdayShort === 'Sáb' ||
                day.weekdayShort === 'Dom'
                  ? 'bg-muted/30'
                  : ''}"
              >
                <div
                  class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:100%_56px] opacity-40"
                ></div>

                {#each day.events.filter((event) => event.startTime < '18:00' && event.endTime > '08:00') as event}
                  <button
                    type="button"
                    class="absolute inset-x-1 overflow-hidden rounded-box border p-2 text-left shadow-xs transition {EVENT_SURFACE[
                      toneOf(event)
                    ]}"
                    style={getEventStyle(event)}
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
                {/each}
              </div>
            {/each}

            <!-- Linha de tempo atual ("Now line"): só aparece se hoje estiver na janela mostrada -->
            {#if data.nowTopPx !== null && data.days.some((d) => d.isToday)}
              <div
                class="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style="top:{data.nowTopPx}px"
              >
                <span class="ml-[52px] size-2 shrink-0 rounded-full bg-destructive"></span>
                <span class="h-px flex-1 bg-destructive"></span>
              </div>
            {/if}
          </div>
        </div>
      </div>
      {#if data.events.some((event) => event.startTime < '08:00' || event.endTime > '18:00')}
        <div class="flex flex-col gap-2 rounded-surface border border-border bg-card p-4">
          <h2 class="text-sm font-semibold">Agendamentos fora do horário da grade</h2>
          {#each data.events.filter((event) => event.startTime < '08:00' || event.endTime > '18:00') as event}
            <button
              type="button"
              class="rounded-control border border-border p-2 text-left text-xs hover:bg-muted"
              onclick={() => actions.onSelectEvent(event)}
            >
              {event.date.split('-').reverse().join('/')} · {event.startTime} – {event.endTime} · {event.title}
            </button>
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
          Nenhuma atividade sincronizada neste período. Sincronize os projetos para carregar PRs e
          issues.
        </p>
      {:else}
        <div class="max-h-[32rem] space-y-4 overflow-y-auto pr-2">
          {#each data.days.filter((day) => day.githubEvents?.length) as day}
            <div>
              <h3 class="mb-2 text-xs font-semibold text-muted-foreground">
                {day.weekdayShort}, {day.dateString.split('-').reverse().join('/')}
              </h3>
              <div class="space-y-2">
                {#each day.githubEvents ?? [] as event}
                  <a
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
                        {event.projectName ?? 'Projeto'} · {timelineKind(event)} · por {event.author ??
                          'desconhecido'}
                      </span>
                    </span>
                    <span class="shrink-0 text-[10px] text-muted-foreground">
                      {timelineDate(event.eventDate)}
                    </span>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </section>
</Tooltip.Provider>
