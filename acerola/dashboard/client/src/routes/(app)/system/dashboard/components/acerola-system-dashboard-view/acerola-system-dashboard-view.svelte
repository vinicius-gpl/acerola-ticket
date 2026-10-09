<script lang="ts" module>
  import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';

  export type AcerolaSystemDashboardViewProps = {
    data: {
      summary: SoftwareDashboard | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      error: string | null;
    };
    actions: {
      onRetry: () => void;
      onOpenKanban: () => void;
      onOpenProjects: () => void;
      onOpenSchedule: () => void;
    };
  };
</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Calendar from '@lucide/svelte/icons/calendar';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Code2 from '@lucide/svelte/icons/code-2';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import Kanban from '@lucide/svelte/icons/kanban';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';

  let { data, state, actions }: AcerolaSystemDashboardViewProps = $props();
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <PageHeader
    data={{
      title: 'Painel de Desenvolvimento e Sistemas',
      description:
        'Visão integrada de software: métricas do mês, Pull Requests do GitHub, chamados de sistemas e cronograma de entregas.',
    }}
  >
    <div class="flex items-center gap-2">
      <ActionButton
        data={{ label: 'Kanban' }}
        ui={{ variant: 'secondary', icon: Kanban }}
        actions={{ onClick: actions.onOpenKanban }}
      />
      <ActionButton
        data={{ label: 'Cronograma' }}
        ui={{ variant: 'secondary', icon: Calendar }}
        actions={{ onClick: actions.onOpenSchedule }}
      />
      <ActionButton
        data={{ label: 'Sistemas' }}
        ui={{ variant: 'primary', icon: Code2 }}
        actions={{ onClick: actions.onOpenProjects }}
      />
    </div>
  </PageHeader>

  {#if state.isLoading}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [0, 1, 2, 3] as idx (idx)}
        <div class="h-32 animate-pulse rounded-surface border border-border bg-muted/50"></div>
      {/each}
    </div>
  {:else if state.error}
    <ErrorState
      data={{
        title: 'Não foi possível carregar o painel',
        message: state.error,
      }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if data.summary}
    {@const s = data.summary}

    <!-- 4 Cartões principais de indicadores do mês -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Chamados no Mês -->
      <div class="flex flex-col justify-between rounded-surface border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chamados no Mês</span>
          <div class="grid size-8 place-items-center rounded-control bg-primary/10 text-primary">
            <LifeBuoy class="size-4" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{s.ticketsMonthSummary.opened}</span>
          <span class="text-xs text-muted-foreground">abertos</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{s.ticketsMonthSummary.resolved} resolvidos</span>
          <span class="font-medium text-success">{s.ticketsMonthSummary.resolutionRate}% taxa</span>
        </div>
      </div>

      <!-- Pull Requests no Mês -->
      <div class="flex flex-col justify-between rounded-surface border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PRs no Mês</span>
          <div class="grid size-8 place-items-center rounded-control bg-primary/10 text-primary">
            <GitPullRequest class="size-4" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{s.prsMonthSummary.total}</span>
          <span class="text-xs text-muted-foreground">registrados</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{s.prsMonthSummary.merged} mergeados</span>
          <span>{s.prsMonthSummary.opened} abertos</span>
        </div>
      </div>

      <!-- Sistemas / Projetos -->
      <div class="flex flex-col justify-between rounded-surface border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sistemas Ativos</span>
          <div class="grid size-8 place-items-center rounded-control bg-primary/10 text-primary">
            <Code2 class="size-4" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{s.projectsSummary.active}</span>
          <span class="text-xs text-muted-foreground">de {s.projectsSummary.total} sistemas</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{s.projectsSummary.maintenance} em manutenção</span>
          <button class="font-medium text-primary hover:underline" onclick={actions.onOpenProjects}>Ver lista</button>
        </div>
      </div>

      <!-- Resolução Média -->
      <div class="flex flex-col justify-between rounded-surface border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo de Resolução</span>
          <div class="grid size-8 place-items-center rounded-control bg-primary/10 text-primary">
            <CheckCircle2 class="size-4" />
          </div>
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {s.ticketsMonthSummary.averageResolutionHours !== null ? `${s.ticketsMonthSummary.averageResolutionHours}h` : '—'}
          </span>
          <span class="text-xs text-muted-foreground">média</span>
        </div>
        <div class="mt-2 text-xs text-muted-foreground">
          {s.ticketsMonthSummary.pending} chamados na fila agora
        </div>
      </div>
    </div>

    <!-- Gráficos de Tendência e Distribuição do Mês -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Tendência Semanal do Mês -->
      <div class="rounded-surface border border-border bg-card p-6 shadow-xs">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evolução no Mês ({s.monthName})</h2>
        <p class="mt-1 text-xs text-muted-foreground">Chamados abertos, resolvidos e Pull Requests semana a semana</p>

        <div class="mt-6 flex flex-col gap-4">
          {#each s.weeklyTrend as week (week.weekLabel)}
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs font-medium text-foreground">
                <span>{week.weekLabel}</span>
                <span class="text-muted-foreground">{week.openedTickets} chamados / {week.pullRequests} PRs</span>
              </div>
              <div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div class="bg-primary" style="width: {Math.min(week.openedTickets * 15, 60)}%" title="Chamados abertos"></div>
                <div class="bg-success" style="width: {Math.min(week.resolvedTickets * 15, 30)}%" title="Chamados resolvidos"></div>
                <div class="bg-warning" style="width: {Math.min(week.pullRequests * 10, 30)}%" title="Pull requests"></div>
              </div>
            </div>
          {/each}
        </div>

        <div class="mt-6 flex items-center justify-center gap-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-primary"></span>
            <span>Abertos</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-success"></span>
            <span>Resolvidos</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-full bg-warning"></span>
            <span>PRs GitHub</span>
          </div>
        </div>
      </div>

      <!-- Tipos de Problema no Mês -->
      <div class="rounded-surface border border-border bg-card p-6 shadow-xs">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chamados por Categoria no Mês</h2>
        <p class="mt-1 text-xs text-muted-foreground">Distribuição dos chamados de software recebidos</p>

        {#if s.ticketsByProblemType.length === 0}
          <div class="grid h-48 place-items-center text-xs text-muted-foreground">
            Nenhum chamado registrado neste mês ainda.
          </div>
        {:else}
          <div class="mt-6 flex flex-col gap-4">
            {#each s.ticketsByProblemType as pt (pt.key)}
              {@const pct = s.ticketsMonthSummary.opened > 0 ? Math.round((pt.count / s.ticketsMonthSummary.opened) * 100) : 0}
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs font-medium text-foreground">
                  <span>{pt.label}</span>
                  <span class="text-muted-foreground tabular-nums">{pt.count} ({pct}%)</span>
                </div>
                <div class="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-primary" style="width: {pct}%"></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Timeline Recente -->
    <div class="rounded-surface border border-border bg-card p-6 shadow-xs">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atividades e Pull Requests Recentes</h2>
          <p class="mt-1 text-xs text-muted-foreground">Últimas movimentações nos repositórios e chamados dos sistemas</p>
        </div>
        <ActionButton
          data={{ label: 'Ver Sistemas' }}
          ui={{ variant: 'secondary', icon: Code2 }}
          actions={{ onClick: actions.onOpenProjects }}
        />
      </div>

      {#if s.recentTimeline.length === 0}
        <div class="mt-6 grid h-28 place-items-center rounded-box border border-dashed border-border text-xs text-muted-foreground">
          Nenhuma atividade sincronizada com o GitHub ainda.
        </div>
      {:else}
        <div class="mt-6 divide-y divide-border/60">
          {#each s.recentTimeline as event (event.id)}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="grid size-8 shrink-0 place-items-center rounded-control bg-muted text-muted-foreground">
                  {#if event.type === 'pr'}
                    <GitPullRequest class="size-4 text-primary" />
                  {:else}
                    <LifeBuoy class="size-4 text-primary" />
                  {/if}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-foreground">{event.title}</span>
                    {#if event.externalId}
                      <span class="rounded-chip bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                        {event.externalId}
                      </span>
                    {/if}
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {event.projectName ? `${event.projectName} · ` : ''}{event.author ? `por ${event.author}` : ''}
                  </p>
                </div>
              </div>
              {#if event.url}
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Abrir no GitHub
                  <ArrowUpRight class="size-3" />
                </a>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
