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
    type Insights,
    type OverloadedMachine,
    type SpareMachine,
    type TroublesomeMachine,
    type UpgradeCandidate,
  } from '@template/shared/schemas/insight.schema';

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
  export type InsightsViewProps = {
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

  export function troubleSummaryOf(machine: TroublesomeMachine): string {
    const alerts = machine.alertCount > 0 ? ` · ${machine.alertCount} alerta(s) no período` : '';

    return `${machine.maintenanceCount} manutenções já feitas${alerts}`;
  }

  /** O que a máquina de reserva tem dentro, em uma linha. */
  export function spareSummaryOf(machine: SpareMachine): string {
    const parts: string[] = [];

    if (machine.cpuModel) parts.push(machine.cpuModel);
    if (machine.memoryGb !== null) parts.push(`${machine.memoryGb} GB de memória`);
    if (machine.diskGb !== null) parts.push(`${machine.diskGb} GB de disco`);

    return parts.length > 0 ? parts.join(' · ') : 'O agente ainda não informou o hardware';
  }
</script>

<script lang="ts">
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import PartyPopper from '@lucide/svelte/icons/party-popper';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: InsightsViewProps = $props();

  const insights = $derived(data.insights);

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
    <SelectField
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
      <p class="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-emerald-700">
        <PartyPopper class="size-4" aria-hidden="true" />
        Nada a recomendar nos últimos {insights.days} dias: nenhuma máquina no limite, nenhuma
        pedindo upgrade e nenhuma dando trabalho demais.
      </p>
    {/if}

    <!-- Sobrecarregadas -->
    <section class="bg-card rounded-xl border p-4">
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
          {#each insights.overloaded as machine (machine.computerId)}
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="text-ink-900 text-sm font-semibold break-words">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs">
                  {departmentOf(machine)} · {overloadSummaryOf(machine)}
                  {#if machine.activeAlerts > 0}
                    · <span class="text-red-700">travada agora</span>
                  {/if}
                </p>
              </div>
              <ActionButton
                data={{ label: 'Abrir ficha' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
              />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Upgrades -->
    <section class="bg-card rounded-xl border p-4">
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
          {#each insights.upgrades as machine (machine.computerId)}
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="text-ink-900 text-sm font-semibold break-words">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs">
                  {departmentOf(machine)} · {upgradeSummaryOf(machine)}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
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
      {/if}
    </section>

    <!-- Dão trabalho demais -->
    <section class="bg-card rounded-xl border p-4">
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
          {#each insights.troublesome as machine (machine.computerId)}
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="text-ink-900 text-sm font-semibold break-words">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs">
                  {departmentOf(machine)} · {troubleSummaryOf(machine)}
                  {#if machine.lastMaintenanceAt}
                    · última em {formatDate(machine.lastMaintenanceAt)}
                  {/if}
                </p>
              </div>
              <ActionButton
                data={{ label: 'Abrir ficha' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
              />
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Reserva -->
    <section class="bg-card rounded-xl border p-4">
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
          {#each insights.spares as machine (machine.computerId)}
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <div class="min-w-0">
                <p class="text-ink-900 text-sm font-semibold break-words">
                  {machineLabelOf(machine)}
                </p>
                <p class="text-ink-500 text-xs break-words">{spareSummaryOf(machine)}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
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
      {/if}
    </section>
  {/if}
</div>
