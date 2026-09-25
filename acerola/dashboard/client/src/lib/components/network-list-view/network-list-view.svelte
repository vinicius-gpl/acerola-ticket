<script lang="ts" module>
  import {
    NETWORK_EVENT_TYPES,
    NETWORK_EVENT_TYPE_LABELS,
    NETWORK_SEVERITIES,
    NETWORK_SEVERITY_LABELS,
    networkEventTypeLabel,
    networkSeverityLabel,
    networkSeverityTone,
    outageDurationSeconds,
    type NetworkEventType,
    type NetworkSeverity,
  } from '@template/shared/domain/network-event.util';
  import {
    type NetworkEvent,
    type NetworkSummary,
  } from '@template/shared/schemas/network-event.schema';

  import { formatDuration } from '$lib/utils/format-machine';

  export type NetworkFilter = {
    type: NetworkEventType | '';
    severity: NetworkSeverity | '';
    onlyOpen: boolean;
    days: number;
  };

  /**
   * A REDE: quedas e instabilidade do link de internet.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, com a internet fora agora e com o mês inteiro em ordem.
   *
   * **O silêncio não é notícia boa.** Esta tela mostra o que o UniFi avisou; o que não chegou
   * aqui não aconteceu para ela. Por isso o estado vazio diz de onde vêm os eventos, em vez
   * de afirmar que a rede está bem.
   */
  export type NetworkListViewProps = {
    data: {
      events: NetworkEvent[];
      total: number;
      summary: NetworkSummary | null;
      filter: NetworkFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isSummaryLoading?: boolean;
      isSaving?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onTypeChange: (type: NetworkEventType | '') => void;
      onSeverityChange: (severity: NetworkSeverity | '') => void;
      onOnlyOpenChange: (onlyOpen: boolean) => void;
      onPeriodChange: (days: number) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onResolveChange: (event: NetworkEvent, isResolved: boolean) => void;
    };
  };

  const TYPE_FILTER_OPTIONS = [
    { value: '', label: 'Todos os avisos' },
    ...NETWORK_EVENT_TYPES.map((type) => ({
      value: type,
      label: NETWORK_EVENT_TYPE_LABELS[type],
    })),
  ];

  const SEVERITY_FILTER_OPTIONS = [
    { value: '', label: 'Qualquer gravidade' },
    ...NETWORK_SEVERITIES.map((severity) => ({
      value: severity,
      label: NETWORK_SEVERITY_LABELS[severity],
    })),
  ];

  const PERIOD_OPTIONS = [7, 30, 90].map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));

  /** Quanto durou, em palavras — ou que ainda está acontecendo. */
  export function durationLabelOf(event: NetworkEvent): string {
    const seconds = outageDurationSeconds(event.occurredAt, event.resolvedAt);

    return seconds === null ? 'Em aberto' : formatDuration(seconds);
  }

  /** As medidas que vieram, em uma linha. Vazio quando o aviso não trouxe número nenhum. */
  export function measuresOf(event: NetworkEvent): string {
    const parts: string[] = [];

    if (event.latencyMs !== null) parts.push(`${Math.round(event.latencyMs)} ms`);
    if (event.packetLossPercent !== null) {
      parts.push(`${event.packetLossPercent.toFixed(1).replace('.', ',')}% de perda`);
    }

    return parts.join(' · ');
  }
</script>

<script lang="ts">
  import SearchX from '@lucide/svelte/icons/search-x';
  import Wifi from '@lucide/svelte/icons/wifi';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import { formatDateTime } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: NetworkListViewProps = $props();

  const summary = $derived(data.summary);
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{ title: 'Rede', description: 'Quedas e instabilidade do link de internet.' }}
  >
    <SelectField
      data={{ value: String(data.filter.days), options: PERIOD_OPTIONS }}
      ui={{ ariaLabel: 'Período' }}
      actions={{ onChange: (value: string) => actions.onPeriodChange(Number(value)) }}
    />
  </PageHeader>

  <StatCardGrid>
    <StatCard
      data={{ label: 'Em aberto agora', value: summary?.open ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
    <StatCard
      data={{ label: 'Quedas no período', value: summary?.outages ?? 0 }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
    <StatCard
      data={{
        label: 'Tempo fora do ar',
        value: formatDuration(summary?.totalOutageSeconds ?? null),
        hint: 'somando as quedas que já terminaram',
      }}
      ui={{ tone: 'info' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
    <StatCard
      data={{
        label: 'Pior latência',
        value: summary?.worstLatencyMs ? `${Math.round(summary.worstLatencyMs)} ms` : '—',
        hint: summary?.worstPacketLossPercent
          ? `${summary.worstPacketLossPercent.toFixed(1).replace('.', ',')}% de perda no pior momento`
          : null,
      }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
  </StatCardGrid>

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState data={{ title: 'Não consegui salvar', message: viewState.actionError }} />
  {/if}

  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    <SelectField
      data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
      ui={{ ariaLabel: 'Filtrar por tipo de aviso' }}
      actions={{ onChange: (value: string) => actions.onTypeChange(value as NetworkEventType | '') }}
    />
    <SelectField
      data={{ value: data.filter.severity, options: SEVERITY_FILTER_OPTIONS }}
      ui={{ ariaLabel: 'Filtrar por gravidade' }}
      actions={{
        onChange: (value: string) => actions.onSeverityChange(value as NetworkSeverity | ''),
      }}
    />
    <label class="text-ink-700 flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="border-ink-300 size-4 rounded"
        checked={data.filter.onlyOpen}
        onchange={(event) => actions.onOnlyOpenChange(event.currentTarget.checked)}
      />
      Só o que está em aberto
    </label>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar os eventos de rede', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os eventos…</p>
  {:else if viewState.isEmpty}
    <!-- O silêncio não é notícia boa: o texto diz DE ONDE os eventos vêm. -->
    <EmptyState
      data={{
        title: 'Nenhum evento no período',
        description:
          'Os avisos chegam do UniFi, pelo endereço de webhook configurado nele. Se a internet caiu e nada apareceu aqui, vale conferir essa configuração — ou registrar a queda à mão.',
      }}
      ui={{ icon: Wifi }}
    />
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum evento com esses filtros',
        description: 'Tente limpar os filtros para ver tudo o que aconteceu no período.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full min-w-[820px] text-left text-sm">
        <thead class="text-ink-500 border-b text-xs uppercase">
          <tr>
            <th scope="col" class="py-2 pr-3">Quando</th>
            <th scope="col" class="py-2 pr-3">O que houve</th>
            <th scope="col" class="py-2 pr-3">Link</th>
            <th scope="col" class="py-2 pr-3">Medidas</th>
            <th scope="col" class="py-2 pr-3">Durou</th>
            <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.events as event (event.id)}
            <tr class="hover:bg-muted/40 border-b last:border-0 align-top">
              <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                {formatDateTime(event.occurredAt)}
              </td>
              <td class="max-w-[320px] py-2 pr-3">
                <div class="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    data={{ label: networkSeverityLabel(event.severity) }}
                    ui={{ tone: networkSeverityTone(event.severity), size: 'sm' }}
                  />
                  <span class="text-ink-900 font-semibold break-words">
                    {networkEventTypeLabel(event.type)}
                  </span>
                </div>
                <span class="text-ink-500 block text-xs break-words">{event.title}</span>
                {#if event.message}
                  <span class="text-ink-500 block text-xs break-words">{event.message}</span>
                {/if}
              </td>
              <td class="text-ink-700 py-2 pr-3 break-words">{event.linkName ?? '—'}</td>
              <td class="text-ink-700 py-2 pr-3 whitespace-nowrap">{measuresOf(event) || '—'}</td>
              <td class="py-2 pr-3">
                {#if event.resolvedAt}
                  <span class="text-ink-700">{durationLabelOf(event)}</span>
                {:else}
                  <StatusBadge data={{ label: 'Em aberto' }} ui={{ tone: 'danger', size: 'sm' }} />
                {/if}
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                {#if event.resolvedAt}
                  <ActionButton
                    data={{ label: 'Reabrir' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    state={{ isDisabled: viewState.isSaving }}
                    actions={{ onClick: () => actions.onResolveChange(event, false) }}
                  />
                {:else}
                  <ActionButton
                    data={{ label: 'Marcar como resolvido' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    state={{ isDisabled: viewState.isSaving }}
                    actions={{ onClick: () => actions.onResolveChange(event, true) }}
                  />
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do histórico. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.events.length} de {data.total} eventos. Use os filtros para chegar ao que
        procura.
      </p>
    {/if}
  {/if}
</div>
