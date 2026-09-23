<script lang="ts" module>
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { departmentLabel, isDepartment } from '@template/shared/domain/department.util';
  import {
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
    type TicketDepartment,
    type TicketProblemType,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    PERIOD_OPTIONS,
    type CountByKey,
    type Dashboard,
    type ProblemMachine,
  } from '@template/shared/schemas/dashboard.schema';

  /**
   * O PAINEL: a saúde do parque num lugar só — o que está pegando fogo hoje.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * com o parque em chamas, com tudo em ordem e recém-instalado.
   *
   * A ordem da tela é a ordem da pergunta de quem chega de manhã: primeiro o que exige ação
   * (chamados abertos, máquinas críticas, preventivas vencidas), depois o mapa das máquinas
   * em pior estado, e por último os gráficos, que servem para decidir e não para apagar
   * incêndio.
   */
  export type DashboardViewProps = {
    data: { summary: Dashboard | null; days: number };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      error: string | null;
    };
    actions: {
      onPeriodChange: (days: number) => void;
      onRetry: () => void;
      onOpenMachine: (machine: ProblemMachine) => void;
      onOpenComputers: () => void;
      onOpenTickets: () => void;
      onOpenMaintenance: () => void;
      onOpenParts: () => void;
    };
  };

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(machine: ProblemMachine): string {
    return machine.computerDisplayName?.trim() || machine.computerName;
  }

  /**
   * O que há de ruim nesta máquina, em uma frase.
   *
   * A frase é montada do que existe, e não de um texto fixo: "Crítica" sozinho não diz se é
   * disco cheio agora ou nota baixa de semanas atrás.
   */
  export function problemSummaryOf(machine: ProblemMachine): string {
    const parts: string[] = [];

    if (machine.activeAlerts > 0) {
      parts.push(
        machine.activeAlerts === 1 ? '1 alerta acontecendo agora' : `${machine.activeAlerts} alertas acontecendo agora`,
      );
    }

    if (machine.maintenanceCount >= 3) parts.push(`${machine.maintenanceCount} manutenções já feitas`);

    return parts.length > 0 ? parts.join(' · ') : `Nota de saúde ${machine.healthScore}/100`;
  }

  /** O tempo médio em palavras. Nulo NÃO vira "0 h": zero anunciaria atendimento instantâneo. */
  export function formatAverage(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;

    return `${hours.toFixed(1).replace('.', ',')} h`;
  }

  /** O rótulo do departamento, que é o mesmo do chamado e o mesmo da máquina. */
  function departmentChartLabel(key: string): string {
    return isDepartment(key) ? departmentLabel(key) : ticketDepartmentLabel(key as TicketDepartment);
  }

  export function toSlices(rows: readonly CountByKey[], kind: 'problem' | 'department') {
    return rows.map((row) => ({
      label:
        kind === 'problem'
          ? ticketProblemTypeLabel(row.key as TicketProblemType)
          : departmentChartLabel(row.key),
      value: row.count,
    }));
  }
</script>

<script lang="ts">
  import PartyPopper from '@lucide/svelte/icons/party-popper';
  import Rocket from '@lucide/svelte/icons/rocket';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ColumnChart from '$lib/components/column-chart/column-chart.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';

  let { data, state: viewState, actions }: DashboardViewProps = $props();

  const summary = $derived(data.summary);

  const PERIOD_SELECT_OPTIONS = PERIOD_OPTIONS.map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));

  const problemSlices = $derived(toSlices(summary?.byProblemType ?? [], 'problem'));
  const departmentSlices = $derived(toSlices(summary?.byDepartment ?? [], 'department'));
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{ title: 'Painel', description: 'A saúde do parque num lugar só.' }}
  >
    <SelectField
      data={{ value: String(data.days), options: PERIOD_SELECT_OPTIONS }}
      ui={{ ariaLabel: 'Período do painel' }}
      actions={{ onChange: (value: string) => actions.onPeriodChange(Number(value)) }}
    />
  </PageHeader>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui montar o painel', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Montando o painel…</p>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Ainda não há o que resumir',
        description:
          'O painel se enche sozinho conforme o sistema for usado: cadastre as máquinas no Inventário e as peças no Depósito, e os chamados começam a aparecer aqui.',
      }}
      ui={{ icon: Rocket }}
    >
      <ActionButton
        data={{ label: 'Ir para o Inventário' }}
        actions={{ onClick: actions.onOpenComputers }}
      />
    </EmptyState>
  {:else if summary}
    <!-- O que exige ação hoje. -->
    <StatCardGrid>
      <StatCard
        data={{
          label: 'Chamados abertos',
          value: summary.tickets.open,
          hint: summary.tickets.inProgress ? `${summary.tickets.inProgress} em atendimento` : null,
        }}
        ui={{ tone: 'danger' }}
      />
      <StatCard
        data={{
          label: 'Máquinas críticas',
          value: summary.park.critical,
          hint: summary.park.attention ? `${summary.park.attention} em atenção` : null,
        }}
        ui={{ tone: 'warning' }}
      />
      <StatCard
        data={{
          label: 'Preventivas vencidas',
          value: summary.maintenance.preventiveDue,
          hint: `de ${summary.park.total} máquinas em uso`,
        }}
        ui={{ tone: 'info' }}
      />
      <StatCard
        data={{
          label: 'Peças sem estoque',
          value: summary.parts.outOfStock,
          hint: `${summary.parts.items} peças na prateleira`,
        }}
        ui={{ tone: 'brand' }}
      />
    </StatCardGrid>

    <!-- O que aconteceu no período. -->
    <section class="bg-card rounded-xl border p-4">
      <h2 class="text-ink-900 mb-3 text-sm font-semibold">Nos últimos {summary.days} dias</h2>
      <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- "Que entraram", e não "abertos": o cartão lá em cima já usa "abertos" para a
             FILA de agora, e o mesmo rótulo para duas contas diferentes é como alguém lê o
             número errado e tira a conclusão errada. -->
        <div>
          <dt class="text-ink-500 text-xs">Chamados que entraram</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.tickets.openedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-ink-500 text-xs">Chamados resolvidos</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.tickets.resolvedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-ink-500 text-xs">Tempo médio de resolução</dt>
          <dd class="text-ink-900 text-lg font-semibold">
            {formatAverage(summary.tickets.averageResolutionHours)}
          </dd>
        </div>
        <div>
          <dt class="text-ink-500 text-xs">Manutenções feitas</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.maintenance.doneInPeriod}</dd>
        </div>
      </dl>
      <div class="mt-3 flex flex-wrap gap-2">
        <ActionButton
          data={{ label: 'Ver chamados' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          actions={{ onClick: actions.onOpenTickets }}
        />
        <ActionButton
          data={{ label: 'Ver manutenção' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          actions={{ onClick: actions.onOpenMaintenance }}
        />
        <ActionButton
          data={{ label: 'Ver depósito' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          actions={{ onClick: actions.onOpenParts }}
        />
      </div>
    </section>

    <!-- O mapa: as máquinas em pior estado, da mais grave para a menos. -->
    <section class="bg-card rounded-xl border p-4">
      <h2 class="text-ink-900 mb-1 text-sm font-semibold">Máquinas que precisam de atenção</h2>
      <p class="text-ink-500 mb-3 text-xs">
        Da mais grave para a menos. Alerta acontecendo agora pesa mais do que nota baixa parada.
      </p>

      {#if summary.worstMachines.length === 0}
        <p class="flex items-center gap-2 text-sm text-emerald-700">
          <PartyPopper class="size-4" aria-hidden="true" />
          Nenhuma máquina apontada. O parque está em ordem.
        </p>
      {:else}
        <ul class="flex flex-col divide-y">
          {#each summary.worstMachines as machine (machine.computerId)}
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="text-ink-900 text-sm font-semibold break-words">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs">
                  {machine.department ? departmentLabel(machine.department) : 'Sem departamento'}
                  · {problemSummaryOf(machine)}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <StatusBadge
                  data={{ label: healthStatusLabel(machine.healthStatus) }}
                  ui={{ tone: healthStatusTone(machine.healthStatus), size: 'sm' }}
                />
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine) }}
                />
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- O que serve para decidir, não para apagar incêndio. -->
    <div class="grid gap-4 lg:grid-cols-2">
      <section class="bg-card rounded-xl border p-4">
        <h2 class="text-ink-900 mb-2 text-sm font-semibold">Problemas por tipo</h2>
        <ColumnChart
          data={{ slices: problemSlices, seriesLabel: 'Chamados' }}
          ui={{ emptyLabel: 'Nenhum chamado no período.' }}
        />
      </section>
      <section class="bg-card rounded-xl border p-4">
        <h2 class="text-ink-900 mb-2 text-sm font-semibold">Quem mais pediu socorro</h2>
        <ColumnChart
          data={{ slices: departmentSlices, seriesLabel: 'Chamados' }}
          ui={{ emptyLabel: 'Nenhum chamado no período.' }}
        />
      </section>
    </div>
  {/if}
</div>
