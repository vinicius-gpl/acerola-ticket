<script lang="ts" module>
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { departmentLabel, isDepartment } from '@template/shared/domain/department.util';
  import {
    ticketDepartmentLabel,
    type TicketDepartment,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    PERIOD_OPTIONS,
    type CountByKey,
    type DailyActivityEntry,
    type Dashboard,
    type HeavyMaintenance,
    type ProblemMachine,
  } from '@template/shared/schemas/dashboard.schema';

  import { type ChartSlice } from '$lib/utils/chart-slice';
  import { type TimePoint, type TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * O PAINEL: a saúde do parque num lugar só — em indicadores e gráficos.
   *
   * A ordem da tela é a ordem da pergunta de quem chega de manhã:
   *
   *  1. **O que exige ação hoje** — os quatro números grandes.
   *  2. **Como o parque está**, em três medidores: é a leitura de relance, e medidor responde
   *     "quanto de quanto" melhor do que número solto.
   *  3. **Está melhorando ou piorando?** — o gráfico de área do movimento diário. Nenhum
   *     número sozinho responde isso, e é a única parte do painel que olha para o TEMPO.
   *  4. **Por quê?** — mapa de problemas, departamentos, recorrência, picos, manutenção
   *     pesada. Cada bloco com o tipo de gráfico que responde à sua pergunta.
   *  5. **Quais máquinas** — a tabela, que é onde a decisão vira clique.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * com o parque em chamas, com tudo em ordem e recém-instalado.
   */
  export type AcerolaDashboardViewProps = {
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
        machine.activeAlerts === 1
          ? '1 alerta acontecendo agora'
          : `${machine.activeAlerts} alertas acontecendo agora`,
      );
    }

    if (machine.maintenanceCount >= 3) {
      parts.push(`${machine.maintenanceCount} manutenções já feitas`);
    }

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

  export function departmentSlices(rows: readonly CountByKey[]): ChartSlice[] {
    return rows.map((row) => ({ label: departmentChartLabel(row.key), value: row.count }));
  }

  /** As máquinas que já consumiram manutenção demais — candidatas a troca. */
  export function heavySlices(rows: readonly HeavyMaintenance[]): ChartSlice[] {
    return rows.map((row) => ({ label: row.computerName, value: row.maintenanceCount }));
  }

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  export const DAILY_SERIES: TimeSeriesDef[] = [
    { key: 'opened', label: 'Entraram', color: 'var(--chart-1)' },
    { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
    { key: 'maintenances', label: 'Manutenções', color: 'var(--chart-5)' },
  ];

  /**
   * O movimento diário no formato do gráfico de tempo.
   *
   * O dia vem como `AAAA-MM-DD` e vira um instante ao MEIO-DIA, e não à meia-noite: num fuso
   * negativo, meia-noite em UTC é o dia anterior aqui, e o gráfico sairia deslocado um dia.
   */
  export function toDailyPoints(days: readonly DailyActivityEntry[]): TimePoint[] {
    return days.map((day) => ({
      at: `${day.day}T12:00:00.000Z`,
      values: {
        opened: day.opened,
        resolved: day.resolved,
        maintenances: day.maintenances,
      },
    }));
  }

  /** Quantas máquinas estão de pé: nem críticas, nem sem o agente instalado. */
  export function healthyCountOf(park: Dashboard['park']): number {
    return Math.max(0, park.total - park.critical - park.neverSeen);
  }

  /** Quanto do que entrou no período já saiu. Sem nada entrando, não há proporção. */
  export function resolutionRateOf(tickets: Dashboard['tickets']): number {
    if (tickets.openedInPeriod === 0) return 0;

    return Math.min(100, Math.round((tickets.resolvedInPeriod / tickets.openedInPeriod) * 100));
  }
</script>

<script lang="ts">
  import PartyPopper from '@lucide/svelte/icons/party-popper';
  import Rocket from '@lucide/svelte/icons/rocket';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import AreaChart from '$lib/components/acerola-area-chart/acerola-area-chart.svelte';
  import ColumnChart from '$lib/components/acerola-column-chart/acerola-column-chart.svelte';
  import DashboardMaintenanceLog from '../acerola-dashboard-maintenance-log/acerola-dashboard-maintenance-log.svelte';
  import DashboardPeaking from '../acerola-dashboard-peaking/acerola-dashboard-peaking.svelte';
  import DashboardProblemMap from '../acerola-dashboard-problem-map/acerola-dashboard-problem-map.svelte';
  import DashboardRecurrence from '../acerola-dashboard-recurrence/acerola-dashboard-recurrence.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';
  import RadialChart from '$lib/components/acerola-radial-chart/acerola-radial-chart.svelte';
  import StatCard from '$lib/components/acerola-stat-card/acerola-stat-card.svelte';
  import StatCardGrid from '$lib/components/acerola-stat-card-grid/acerola-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import TableViewToggle from '$lib/components/acerola-table-view-toggle/acerola-table-view-toggle.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/acerola-table/acerola-table';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: AcerolaDashboardViewProps = $props();

  const tableView = useTableViewModel();

  const summary = $derived(data.summary);

  const PERIOD_SELECT_OPTIONS = PERIOD_OPTIONS.map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{ title: 'Painel', description: 'Os indicadores do parque, num lugar só.' }}
  >
    <OptionPicker
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
    <p class="text-muted-foreground py-10 text-center text-sm">Montando o painel…</p>
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
    <!-- 1. O que exige ação hoje. -->
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

    <!-- 2. Como o parque está: "quanto de quanto", que é o que medidor responde bem. -->
    <PanelCard
      data={{
        title: 'Como o parque está',
        hint: `Uma leitura de relance dos últimos ${summary.days} dias`,
      }}
    >
      <div class="grid gap-4 sm:grid-cols-3">
        <RadialChart
          data={{
            value: healthyCountOf(summary.park),
            max: Math.max(1, summary.park.total),
            label: 'Máquinas de pé',
            hint: `de ${summary.park.total} cadastradas`,
          }}
          ui={{ color: 'var(--chart-4)' }}
        />
        <RadialChart
          data={{
            value: resolutionRateOf(summary.tickets),
            label: 'Taxa de resolução',
            display: `${resolutionRateOf(summary.tickets)}%`,
            hint: `${summary.tickets.resolvedInPeriod} de ${summary.tickets.openedInPeriod} que entraram`,
          }}
          ui={{ color: 'var(--chart-1)' }}
        />
        <!-- "Em dia", e não "vencidas": nos três medidores CHEIO É BOM, e misturar um
             invertido no meio faria a fileira inteira ser lida ao contrário. O número de
             vencidas continua em cima, no cartão vermelho, que é onde ele cobra ação. -->
        <RadialChart
          data={{
            value: Math.max(0, summary.park.total - summary.maintenance.preventiveDue),
            max: Math.max(1, summary.park.total),
            label: 'Preventivas em dia',
            hint: `${summary.maintenance.doneInPeriod} manutenções feitas no período`,
          }}
          ui={{ color: 'var(--chart-5)' }}
        />
      </div>

    </PanelCard>

    <!-- 3. Está melhorando ou piorando? É a única parte que olha para o tempo. -->
    <PanelCard
      data={{
        title: `Nos últimos ${summary.days} dias`,
        hint: 'O que entrou, o que saiu e o que foi feito, dia a dia',
      }}
    >
      <!-- Os números do período ANTES do gráfico: a curva mostra a forma, e estes quatro
           dizem o tamanho. Um sem o outro deixa metade da pergunta sem resposta.

           "Que entraram", e não "abertos": o cartão lá em cima já usa "abertos" para a FILA
           de agora, e o mesmo rótulo para duas contas diferentes é como alguém lê o número
           errado e decide errado. -->
      <dl class="mb-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="text-muted-foreground text-xs">Chamados que entraram</dt>
          <dd class="text-foreground text-lg font-semibold">{summary.tickets.openedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground text-xs">Chamados resolvidos</dt>
          <dd class="text-foreground text-lg font-semibold">{summary.tickets.resolvedInPeriod}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground text-xs">Tempo médio de resolução</dt>
          <dd class="text-foreground text-lg font-semibold">
            {formatAverage(summary.tickets.averageResolutionHours)}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground text-xs">Manutenções feitas</dt>
          <dd class="text-foreground text-lg font-semibold">{summary.maintenance.doneInPeriod}</dd>
        </div>
      </dl>

      <AreaChart
        data={{ points: toDailyPoints(summary.daily), series: DAILY_SERIES }}
        ui={{
          layout: 'overlap',
          tick: 'day',
          heightClass: 'h-56',
          emptyLabel: 'Nada aconteceu no período escolhido.',
        }}
      />
      <div class="border-border/60 mt-4 flex flex-wrap gap-2 border-t pt-3">
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
    </PanelCard>

    <!-- 4. Por quê: cada bloco com o gráfico que responde à sua pergunta. -->
    <div class="grid gap-4 lg:grid-cols-2">
      <DashboardProblemMap
        data={{
          byProblemType: summary.byProblemType,
          byMaintenanceType: summary.panels.maintenanceByType.month,
        }}
        actions={{ onSelectProblem: actions.onOpenTickets }}
      />

      <PanelCard
        data={{
          title: 'Quem mais pediu socorro',
          hint: `Por departamento, nos últimos ${summary.days} dias`,
        }}
      >
        <!-- Deitado, o gráfico tem a altura do conteúdo: uma linha por barra. O teto aqui é
             para uma lista longa rolar dentro do bloco, em vez de esticar a página. -->
        <div class="max-h-72 overflow-x-hidden overflow-y-auto">
          <ColumnChart
            data={{ slices: departmentSlices(summary.byDepartment), seriesLabel: 'Chamados' }}
            ui={{ orientation: 'horizontal', emptyLabel: 'Nenhum chamado no período.' }}
            actions={{ onSelect: actions.onOpenTickets }}
          />
        </div>
      </PanelCard>

      <DashboardRecurrence
        data={{
          byPerson: summary.panels.recurringByPerson,
          byMachine: summary.panels.recurringByMachine,
        }}
      />

      <DashboardPeaking data={{ machines: summary.panels.peaking }} />

      <PanelCard
        data={{
          title: 'Manutenção pesada',
          hint: 'Da terceira manutenção em diante, a máquina já é candidata a troca',
        }}
      >
        <!-- Deitado, o gráfico tem a altura do conteúdo: uma linha por barra. O teto aqui é
             para uma lista longa rolar dentro do bloco, em vez de esticar a página. -->
        <div class="max-h-72 overflow-x-hidden overflow-y-auto">
          <ColumnChart
            data={{
              slices: heavySlices(summary.panels.heavyMaintenance),
              seriesLabel: 'Manutenções',
            }}
            ui={{
              orientation: 'horizontal',
              emptyLabel: 'Nenhuma máquina passou do limite de manutenções.',
            }}
            actions={{ onSelect: actions.onOpenMaintenance }}
          />
        </div>
      </PanelCard>

      <DashboardMaintenanceLog
        data={{
          log: summary.panels.maintenanceLog,
          plannedToday: summary.panels.plannedToday,
          isDoneToday: summary.panels.doneToday,
        }}
      />
    </div>

    <!-- 5. Quais máquinas: é onde a decisão vira clique.

         Na MESMA casca dos outros blocos (`PanelCard`). Antes era uma seção própria com o
         título coberto por uma linha de borda que ia de ponta a ponta do cartão: as linhas
         encostavam nos cantos arredondados e o bloco parecia cortado nas laterais, enquanto
         todos os outros da tela são fechados com uma borda fina em volta. -->
    <PanelCard
      data={{
        title: 'Máquinas que precisam de atenção',
        hint: 'Da mais grave para a menos. Alerta acontecendo agora pesa mais do que nota baixa parada.',
      }}
    >
      {#snippet tools()}
        {#if summary.worstMachines.length > 0}
          <TableViewToggle />
        {/if}
      {/snippet}
      {#if summary.worstMachines.length === 0}
        <p class="flex items-center gap-2 text-sm text-success">
          <PartyPopper class="size-4" aria-hidden="true" />
          Nenhuma máquina apontada. O parque está em ordem.
        </p>
      {:else}
        <!-- Lista de cartões para mobile (< xl) -->
        <div
          class={cn('flex flex-col gap-3', !tableView.forceCards && 'xl:hidden')}
          data-slot="worst-machines-cards-mobile"
        >
          {#each summary.worstMachines as machine (machine.computerId)}
            <div class="border-border/70 bg-card rounded-surface border p-4 shadow-xs">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-foreground font-medium break-words">
                    {machineLabelOf(machine)}
                  </p>
                  <p class="text-muted-foreground text-xs">
                    {machine.department ? departmentLabel(machine.department) : 'Sem departamento'}
                  </p>
                </div>
                <StatusBadge
                  data={{ label: healthStatusLabel(machine.healthStatus) }}
                  ui={{ tone: healthStatusTone(machine.healthStatus), size: 'sm' }}
                />
              </div>

              <p class="text-muted-foreground mt-2 text-xs">
                {problemSummaryOf(machine)}
              </p>

              <div class="border-border/60 mt-3 flex items-center justify-end border-t pt-2">
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine) }}
                />
              </div>
            </div>
          {/each}
          <div class="text-muted-foreground flex justify-between px-1 text-xs">
            <span>Triagem automática por gravidade</span>
            <span>{summary.worstMachines.length} máquina(s) com pendência</span>
          </div>
        </div>

        <!-- Tabela completa para desktop (>= xl) -->
        <div
          class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
          data-slot="worst-machines-table-desktop"
        >
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
                    <p class="text-foreground font-medium break-words">
                      {machineLabelOf(machine)}
                    </p>
                    <p class="text-muted-foreground text-xs">
                      {machine.department ? departmentLabel(machine.department) : 'Sem departamento'}
                    </p>
                  </TableCell>
                  <TableCell class="text-muted-foreground text-xs">
                    {problemSummaryOf(machine)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      data={{ label: healthStatusLabel(machine.healthStatus) }}
                      ui={{ tone: healthStatusTone(machine.healthStatus), size: 'sm' }}
                    />
                  </TableCell>
                  <TableCell class="text-right whitespace-nowrap">
                    <TableActions>
                      <ActionButton
                        data={{ label: 'Abrir ficha' }}
                        ui={{ variant: 'secondary', size: 'sm' }}
                        actions={{ onClick: () => actions.onOpenMachine(machine) }}
                      />
                    </TableActions>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
            {#snippet footer()}
              <span>Triagem automática por gravidade</span>
              <span>{summary.worstMachines.length} máquina(s) com pendência</span>
            {/snippet}
          </Table>
        </div>
      {/if}
    </PanelCard>
  {/if}
</div>
