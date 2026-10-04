<script lang="ts" module>
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    OVERLOADED_CPU_PERCENT,
    OVERLOADED_MEMORY_PERCENT,
    TROUBLESOME_MAINTENANCE_COUNT,
    UPGRADE_MEMORY_GB,
    upgradeReasonLabel,
  } from '@template/shared/domain/insight-rules.util';
  import {
    UPGRADE_REASONS,
    type Insights,
    type OverloadedMachine,
    type SpareMachine,
    type TroublesomeMachine,
    type UpgradeCandidate,
  } from '@template/shared/schemas/insight.schema';

  import { type ChartSlice } from '$lib/utils/chart-slice';

  export const INSIGHTS_SECTION_PAGE_SIZE = 5;

  /**
   * A INTELIGÊNCIA: o que os dados juntos dizem, e que nenhuma tela sozinha mostra.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * com o parque em ordem e com recomendação em todas as quatro listas.
   *
   * Cada lista diz a RÉGUA que usou, no cabeçalho. Uma recomendação sem a régua ao lado é
   * uma opinião: quem lê precisa poder discordar dela com conhecimento de causa — e pedir
   * para mudarmos o número.
   */
  export type AcerolaInsightsViewProps = {
    data: { insights: Insights | null; days: number };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      error: string | null;
    };
    actions: {
      onPeriodChange: (days: number) => void;
      onRetry: () => void;
      onOpenMachine: (computerId: number) => void;
      onOpenComputers: () => void;
    };
  };

  type AnyMachine = { computerName: string; computerDisplayName: string | null };

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(machine: AnyMachine): string {
    return machine.computerDisplayName?.trim() || machine.computerName;
  }

  export function departmentOf(machine: { department: string | null }): string {
    return machine.department
      ? departmentLabel(machine.department as never)
      : 'Sem departamento';
  }

  /** Por que esta máquina está na lista de sobrecarregadas, em números. */
  export function overloadSummaryOf(machine: OverloadedMachine): string {
    return `Processador em ${machine.averageCpuPercent}% e memória em ${machine.averageMemoryPercent}%, na média`;
  }

  /** O número que sustenta a recomendação de upgrade. */
  export function upgradeSummaryOf(machine: UpgradeCandidate): string {
    return machine.reason === 'memory'
      ? `Tem ${machine.value} GB de memória`
      : `Só ${machine.value}% de espaço livre no disco`;
  }

  /**
   * As três contas LADO A LADO, e nunca somadas.
   *
   * Manutenção é trabalho feito, alerta é a máquina reclamando sozinha, chamado é uma pessoa
   * reclamando. Somá-las daria um número que parece preciso e não é — e é justamente a
   * leitura das três separadas que diz se o problema é a máquina ou quem a usa.
   *
   * Cada conta só aparece quando existe: "0 alerta" é ruído numa linha que já é longa.
   */
  export function troubleSummaryOf(machine: TroublesomeMachine): string {
    const parts = [`${machine.maintenanceCount} manutenções já feitas`];

    if (machine.alertCount > 0) parts.push(`${machine.alertCount} alerta(s) no período`);
    if (machine.ticketCount > 0) parts.push(`${machine.ticketCount} chamado(s) no período`);

    return parts.join(' · ');
  }

  /** O que a máquina de reserva tem dentro, em uma linha. */
  export function spareSummaryOf(machine: SpareMachine): string {
    const parts: string[] = [];

    if (machine.cpuModel) parts.push(machine.cpuModel);
    if (machine.memoryGb !== null) parts.push(`${machine.memoryGb} GB de memória`);
    if (machine.diskGb !== null) parts.push(`${machine.diskGb} GB de disco`);

    return parts.length > 0 ? parts.join(' · ') : 'O agente ainda não informou o hardware';
  }

  /**
   * As máquinas sobrecarregadas em barras, pela MÉDIA de processador.
   *
   * A média, e não o pico: todo computador chega a 100% ao abrir um programa, e ordenar pelo
   * pico colocaria na frente justamente a máquina que está bem.
   */
  export function overloadSlices(machines: readonly OverloadedMachine[]): ChartSlice[] {
    return machines
      .map((machine) => ({
        label: machineLabelOf(machine),
        value: Math.round(machine.averageCpuPercent),
      }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * De que o bolo de upgrades é feito: quantas MÁQUINAS por motivo.
   *
   * Conta máquinas, e não os números que sustentam cada recomendação: somar "4 GB de memória"
   * com "12% de disco livre" daria um número sem significado nenhum.
   *
   * Uma fatia por motivo do catálogo, mesmo quando ela é zero — as fatias zeradas saem no
   * fim. Assim a rosca tem sempre as mesmas cores, e "só falta memória" se lê de relance.
   */
  export function upgradeSlices(machines: readonly UpgradeCandidate[]): ChartSlice[] {
    return UPGRADE_REASONS.map((reason) => ({
      label: upgradeReasonLabel(reason),
      value: machines.filter((machine) => machine.reason === reason).length,
    }))
      .filter((slice) => slice.value > 0)
      .sort((a, b) => b.value - a.value);
  }
</script>

<script lang="ts">
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import PartyPopper from '@lucide/svelte/icons/party-popper';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ColumnChart from '$lib/components/acerola-column-chart/acerola-column-chart.svelte';
  import DonutChart from '$lib/components/acerola-donut-chart/acerola-donut-chart.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PaginationBar from '$lib/components/acerola-pagination-bar/acerola-pagination-bar.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AcerolaInsightsViewProps = $props();

  const insights = $derived(data.insights);

  let overloadedPage = $state(1);
  let upgradesPage = $state(1);
  let troublesomePage = $state(1);
  let sparesPage = $state(1);

  $effect(() => {
    /* Reinicia as páginas ao trocar o período de análise. */
    void data.days;
    overloadedPage = 1;
    upgradesPage = 1;
    troublesomePage = 1;
    sparesPage = 1;
  });

  const paginatedOverloaded = $derived(
    insights?.overloaded.slice(
      (overloadedPage - 1) * INSIGHTS_SECTION_PAGE_SIZE,
      overloadedPage * INSIGHTS_SECTION_PAGE_SIZE,
    ) ?? [],
  );

  const paginatedUpgrades = $derived(
    insights?.upgrades.slice(
      (upgradesPage - 1) * INSIGHTS_SECTION_PAGE_SIZE,
      upgradesPage * INSIGHTS_SECTION_PAGE_SIZE,
    ) ?? [],
  );

  const paginatedTroublesome = $derived(
    insights?.troublesome.slice(
      (troublesomePage - 1) * INSIGHTS_SECTION_PAGE_SIZE,
      troublesomePage * INSIGHTS_SECTION_PAGE_SIZE,
    ) ?? [],
  );

  const paginatedSpares = $derived(
    insights?.spares.slice(
      (sparesPage - 1) * INSIGHTS_SECTION_PAGE_SIZE,
      sparesPage * INSIGHTS_SECTION_PAGE_SIZE,
    ) ?? [],
  );

  const PERIOD_OPTIONS = [7, 30, 90].map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));

  const hasAnything = $derived(
    Boolean(
      insights &&
        (insights.overloaded.length > 0 ||
          insights.upgrades.length > 0 ||
          insights.troublesome.length > 0 ||
          insights.spares.length > 0),
    ),
  );
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Inteligência',
      description: 'O que os dados juntos dizem, e que nenhuma tela sozinha mostra.',
    }}
  >
    <OptionPicker
      data={{ value: String(data.days), options: PERIOD_OPTIONS }}
      ui={{ ariaLabel: 'Período' }}
      actions={{ onChange: (value: string) => actions.onPeriodChange(Number(value)) }}
    />
  </PageHeader>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui cruzar os dados', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Cruzando os dados do parque…</p>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Ainda não há o que cruzar',
        description:
          'Esta tela vive do que as outras registram: máquinas no Inventário, leituras do agente e manutenções. Cadastre as máquinas e instale o agente nelas para as recomendações começarem a aparecer.',
      }}
      ui={{ icon: Lightbulb }}
    >
      <ActionButton
        data={{ label: 'Ir para o Inventário' }}
        actions={{ onClick: actions.onOpenComputers }}
      />
    </EmptyState>
  {:else if insights}
    {#if !hasAnything}
      <p class="flex items-center gap-2 rounded-surface border bg-card p-4 text-sm text-emerald-700">
        <PartyPopper class="size-4" aria-hidden="true" />
        Nada a recomendar nos últimos {insights.days} dias: nenhuma máquina no limite, nenhuma
        pedindo upgrade e nenhuma dando trabalho demais.
      </p>
    {/if}

    <!-- O retrato dos números ANTES das listas: as listas dizem o que fazer com cada
         máquina, os gráficos dizem se o problema é geral ou de duas máquinas. Barra deitada
         para comparar máquinas pelo nome; rosca para ver de que o bolo de upgrades é feito. -->
    {#if hasAnything}
      <div class="grid gap-4 lg:grid-cols-2">
        <PanelCard
          data={{
            title: 'Quem vive no limite',
            hint: `Média de processador nos últimos ${insights.days} dias`,
          }}
        >
          <div class="max-h-72 overflow-x-hidden overflow-y-auto">
            <ColumnChart
              data={{ slices: overloadSlices(insights.overloaded), seriesLabel: '% de processador' }}
              ui={{
                orientation: 'horizontal',
                emptyLabel: 'Nenhuma máquina vivendo no limite no período.',
              }}
            />
          </div>
        </PanelCard>

        <PanelCard
          data={{ title: 'De que os upgrades são feitos', hint: 'O que falta nas máquinas apontadas' }}
        >
          <div class="h-60 sm:h-56">
            <DonutChart
              data={{ slices: upgradeSlices(insights.upgrades), seriesLabel: 'Máquinas' }}
              ui={{ emptyLabel: 'Nenhuma máquina pedindo upgrade.' }}
            />
          </div>
        </PanelCard>
      </div>
    {/if}

    <!-- Sobrecarregadas -->
    <section class="bg-card rounded-surface border p-4">
      <h2 class="text-ink-900 text-sm font-semibold">Máquinas sobrecarregadas</h2>
      <p class="text-ink-500 mb-3 text-xs">
        Média de uso nos últimos {insights.days} dias acima de {OVERLOADED_CPU_PERCENT}% de
        processador ou {OVERLOADED_MEMORY_PERCENT}% de memória. É a média, não o pico: todo
        computador chega a 100% ao abrir um programa.
      </p>

      {#if insights.overloaded.length === 0}
        <p class="text-ink-500 text-sm">Nenhuma máquina vivendo no limite no período.</p>
      {:else}
        <ul class="flex flex-col divide-y">
          {#each paginatedOverloaded as machine (machine.computerId)}
            <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <p class="text-ink-900 text-sm font-semibold break-words leading-tight">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                  {departmentOf(machine)} · {overloadSummaryOf(machine)}
                  {#if machine.activeAlerts > 0}
                    · <span class="text-red-700 font-medium">travada agora</span>
                  {/if}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2 pt-0.5">
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
                />
              </div>
            </li>
          {/each}
        </ul>

        {#if insights.overloaded.length > INSIGHTS_SECTION_PAGE_SIZE}
          <div class="mt-3 border-t pt-2">
            <PaginationBar
              data={{
                page: overloadedPage,
                pageSize: INSIGHTS_SECTION_PAGE_SIZE,
                total: insights.overloaded.length,
                noun: ['máquina', 'máquinas'],
              }}
              actions={{
                onPageChange: (newPage) => {
                  overloadedPage = newPage;
                },
              }}
            />
          </div>
        {/if}
      {/if}
    </section>

    <!-- Upgrades -->
    <section class="bg-card rounded-surface border p-4">
      <h2 class="text-ink-900 text-sm font-semibold">Quem precisa de upgrade</h2>
      <p class="text-ink-500 mb-3 text-xs">
        Menos de {UPGRADE_MEMORY_GB} GB de memória, ou disco quase cheio. Troca de HD por SSD não
        entra: o agente não distingue um do outro, e recomendar o que já está feito faria esta
        tela perder a confiança.
      </p>

      {#if insights.upgrades.length === 0}
        <p class="text-ink-500 text-sm">Nenhuma máquina pedindo upgrade.</p>
      {:else}
        <ul class="flex flex-col divide-y">
          {#each paginatedUpgrades as machine (machine.computerId)}
            <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <p class="text-ink-900 text-sm font-semibold break-words leading-tight">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                  {departmentOf(machine)} · {upgradeSummaryOf(machine)}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2 pt-0.5">
                <StatusBadge
                  data={{ label: upgradeReasonLabel(machine.reason) }}
                  ui={{ tone: 'info', size: 'sm' }}
                />
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
                />
              </div>
            </li>
          {/each}
        </ul>

        {#if insights.upgrades.length > INSIGHTS_SECTION_PAGE_SIZE}
          <div class="mt-3 border-t pt-2">
            <PaginationBar
              data={{
                page: upgradesPage,
                pageSize: INSIGHTS_SECTION_PAGE_SIZE,
                total: insights.upgrades.length,
                noun: ['máquina', 'máquinas'],
              }}
              actions={{
                onPageChange: (newPage) => {
                  upgradesPage = newPage;
                },
              }}
            />
          </div>
        {/if}
      {/if}
    </section>

    <!-- Dão trabalho demais -->
    <section class="bg-card rounded-surface border p-4">
      <h2 class="text-ink-900 text-sm font-semibold">Máquinas que dão mais trabalho</h2>
      <p class="text-ink-500 mb-3 text-xs">
        A partir de {TROUBLESOME_MAINTENANCE_COUNT} manutenções registradas. A conta é de
        manutenção e alerta — não de chamado: neste sistema o chamado é aberto por uma pessoa
        de um departamento, e não diz de qual máquina se trata.
      </p>

      {#if insights.troublesome.length === 0}
        <p class="text-ink-500 text-sm">Nenhuma máquina com histórico de trabalho pesado.</p>
      {:else}
        <ul class="flex flex-col divide-y">
          {#each paginatedTroublesome as machine (machine.computerId)}
            <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <p class="text-ink-900 text-sm font-semibold break-words leading-tight">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                  {departmentOf(machine)} · {troubleSummaryOf(machine)}
                  {#if machine.lastMaintenanceAt}
                    · última em {formatDate(machine.lastMaintenanceAt)}
                  {/if}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2 pt-0.5">
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
                />
              </div>
            </li>
          {/each}
        </ul>

        {#if insights.troublesome.length > INSIGHTS_SECTION_PAGE_SIZE}
          <div class="mt-3 border-t pt-2">
            <PaginationBar
              data={{
                page: troublesomePage,
                pageSize: INSIGHTS_SECTION_PAGE_SIZE,
                total: insights.troublesome.length,
                noun: ['máquina', 'máquinas'],
              }}
              actions={{
                onPageChange: (newPage) => {
                  troublesomePage = newPage;
                },
              }}
            />
          </div>
        {/if}
      {/if}
    </section>

    <!-- Reserva -->
    <section class="bg-card rounded-surface border p-4">
      <h2 class="text-ink-900 text-sm font-semibold">Máquinas de reserva</h2>
      <p class="text-ink-500 mb-3 text-xs">
        As que estão cadastradas e SEM departamento — é assim que o sistema sabe que elas estão
        na prateleira esperando alguém. A melhor primeiro.
      </p>

      {#if insights.spares.length === 0}
        <p class="text-ink-500 text-sm">
          Nenhuma máquina de reserva. Para deixar uma disponível, tire o departamento dela na
          ficha.
        </p>
      {:else}
        <ul class="flex flex-col divide-y">
          {#each paginatedSpares as machine (machine.computerId)}
            <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <p class="text-ink-900 text-sm font-semibold break-words leading-tight">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs mt-1 break-words leading-normal">{spareSummaryOf(machine)}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2 pt-0.5">
                <StatusBadge
                  data={{ label: healthStatusLabel(machine.healthStatus) }}
                  ui={{ tone: healthStatusTone(machine.healthStatus), size: 'sm' }}
                />
                <ActionButton
                  data={{ label: 'Abrir ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
                />
              </div>
            </li>
          {/each}
        </ul>

        {#if insights.spares.length > INSIGHTS_SECTION_PAGE_SIZE}
          <div class="mt-3 border-t pt-2">
            <PaginationBar
              data={{
                page: sparesPage,
                pageSize: INSIGHTS_SECTION_PAGE_SIZE,
                total: insights.spares.length,
                noun: ['máquina', 'máquinas'],
              }}
              actions={{
                onPageChange: (newPage) => {
                  sparesPage = newPage;
                },
              }}
            />
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>
