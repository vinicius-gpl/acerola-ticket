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
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';

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
    <!-- O que aconteceu no período. -->
    <section class="bg-card rounded-2xl border border-border p-5 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Nos últimos {summary.days} dias</h2>
        <span class="text-[11px] text-neutral-400">Resumo de desempenho</span>
      </div>
      <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- "Que entraram", e não "abertos": o cartão lá em cima já usa "abertos" para a
             FILA de agora, e o mesmo rótulo para duas contas diferentes é como alguém lê o
             número errado e tira a conclusão errada. -->
        <div>
          <dt class="text-xs text-neutral-400">Chamados que entraram</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.tickets.openedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-xs text-neutral-400">Chamados resolvidos</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.tickets.resolvedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-xs text-neutral-400">Tempo médio de resolução</dt>
          <dd class="text-ink-900 text-lg font-semibold">
            {formatAverage(summary.tickets.averageResolutionHours)}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-neutral-400">Manutenções feitas</dt>
          <dd class="text-ink-900 text-lg font-semibold">{summary.maintenance.doneInPeriod}</dd>
        </div>
      </dl>
      <div class="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
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
    <section class="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div class="border-b border-border/80 px-6 py-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Máquinas que precisam de atenção</h2>
        <p class="mt-0.5 text-xs text-neutral-400">
          Da mais grave para a menos. Alerta acontecendo agora pesa mais do que nota baixa parada.
        </p>
      </div>

      {#if summary.worstMachines.length === 0}
        <div class="p-6">
          <p class="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <PartyPopper class="size-4" aria-hidden="true" />
            Nenhuma máquina apontada. O parque está em ordem.
          </p>
        </div>
      {:else}
        <Table class="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Máquina</TableHead>
              <TableHead>Diagnóstico / Alertas</TableHead>
              <TableHead>Estado de saúde</TableHead>
              <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each summary.worstMachines as machine (machine.computerId)}
              <TableRow>
                <TableCell>
                  <p class="font-medium text-neutral-900 dark:text-neutral-100 break-words">
                    {machineLabelOf(machine)}
                  </p>
                  <p class="text-xs text-neutral-400">
                    {machine.department ? departmentLabel(machine.department) : 'Sem departamento'}
                  </p>
                </TableCell>
                <TableCell class="text-xs text-neutral-600 dark:text-neutral-300">
                  {problemSummaryOf(machine)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    data={{ label: healthStatusLabel(machine.healthStatus) }}
                    ui={{ tone: healthStatusTone(machine.healthStatus), size: 'sm' }}
                  />
                </TableCell>
                <TableCell class="text-right">
                  <ActionButton
                    data={{ label: 'Abrir ficha' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpenMachine(machine) }}
                  />
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
          {#snippet footer()}
            <span>Triagem automática por gravidade</span>
            <span>{summary.worstMachines.length} máquina(s) com pendência</span>
          {/snippet}
        </Table>
      {/if}
    </section>

    <!-- O que serve para decidir, não para apagar incêndio. -->
    <div class="grid gap-4 lg:grid-cols-2">
      <section class="bg-card rounded-2xl border border-border p-5 shadow-xs">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Problemas por tipo</h2>
          <span class="text-[11px] text-neutral-400">Distribuição</span>
        </div>
        <!-- Altura fixa: o gráfico preenche o espaço que recebe, e sem uma caixa de altura de
             verdade ele nasce com altura zero e os rótulos vazam por cima do que vem depois. -->
        <div class="h-64">
          <ColumnChart
            data={{ slices: problemSlices, seriesLabel: 'Chamados' }}
            ui={{ emptyLabel: 'Nenhum chamado no período.' }}
          />
        </div>
      </section>
      <section class="bg-card rounded-2xl border border-border p-5 shadow-xs">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Quem mais pediu socorro</h2>
          <span class="text-[11px] text-neutral-400">Volume</span>
        </div>
        <div class="h-64">
          <ColumnChart
            data={{ slices: departmentSlices, seriesLabel: 'Chamados' }}
            ui={{ emptyLabel: 'Nenhum chamado no período.' }}
          />
        </div>
      </section>
    </div>
  {/if}
</div>
