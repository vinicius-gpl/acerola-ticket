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
  export type AcerolaNetworkListViewProps = {
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

  const TYPE_FILTER_OPTIONS = NETWORK_EVENT_TYPES.map((type) => ({
    value: type,
    label: NETWORK_EVENT_TYPE_LABELS[type],
  }));

  const SEVERITY_FILTER_OPTIONS = NETWORK_SEVERITIES.map((severity) => ({
    value: severity,
    label: NETWORK_SEVERITY_LABELS[severity],
    tone: networkSeverityTone(severity),
  }));

  const PERIOD_OPTIONS = [7, 30, 90].map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));

  /** "Andamento": a opção sem valor ("Todos") vem do `allLabel` do seletor. */
  const ONLY_OPEN_OPTIONS = [{ value: 'yes', label: 'Só em aberto' }];

  /** O tipo de aviso que o cartão "Quedas no período" conta (a queda do link de internet). */
  const OUTAGE_TYPE: NetworkEventType = 'wan_down';

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
  import FilterX from '@lucide/svelte/icons/filter-x';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Wifi from '@lucide/svelte/icons/wifi';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
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
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
  import { cn } from '$lib/utils/cn';
  import { formatDateTime } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AcerolaNetworkListViewProps = $props();

  const summary = $derived(data.summary);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    Boolean(data.filter.type || data.filter.severity || data.filter.onlyOpen),
  );

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  function applyShortcut(change: () => void) {
    change();

    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    filtersElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{ title: 'Rede', description: 'Quedas e instabilidade do link de internet.' }}
  >
    <OptionPicker
      data={{ value: String(data.filter.days), options: PERIOD_OPTIONS }}
      ui={{ ariaLabel: 'Período' }}
      actions={{ onChange: (value: string) => actions.onPeriodChange(Number(value)) }}
    />
  </PageHeader>

  <StatCardGrid>
    <!-- Estes dois são ATALHOS de filtro: "Em aberto agora" liga "só em aberto", e "Quedas no
         período" filtra pelo tipo de aviso de queda (o mesmo que o número conta). Clicar de
         novo desliga. Os outros dois são medidas, sem filtro correspondente. -->
    <StatCard
      data={{ label: 'Em aberto agora', value: summary?.open ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.onlyOpen }}
      actions={{
        onClick: () => applyShortcut(() => actions.onOnlyOpenChange(!data.filter.onlyOpen)),
      }}
    />
    <StatCard
      data={{ label: 'Quedas no período', value: summary?.outages ?? 0 }}
      ui={{ tone: 'warning' }}
      state={{
        isLoading: viewState.isSummaryLoading,
        isSelected: data.filter.type === OUTAGE_TYPE,
      }}
      actions={{
        onClick: () =>
          applyShortcut(() =>
            actions.onTypeChange(data.filter.type === OUTAGE_TYPE ? '' : OUTAGE_TYPE),
          ),
      }}
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

  <!-- Uma fileira, cada filtro com o nome em cima. "Andamento" era uma caixa de seleção solta
       embaixo dos outros; agora é um filtro como os demais, com as duas escolhas à vista. -->
  <div bind:this={filtersElement} class="flex scroll-mt-4 flex-wrap items-end gap-x-4 gap-y-3">
    <FilterField data={{ label: 'Tipo de aviso' }}>
      <OptionPicker
        data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo de aviso', allLabel: 'Todos os avisos' }}
        actions={{ onChange: (value: string) => actions.onTypeChange(value as NetworkEventType | '') }}
      />
    </FilterField>
    <FilterField data={{ label: 'Gravidade' }}>
      <OptionPicker
        data={{ value: data.filter.severity, options: SEVERITY_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por gravidade', allLabel: 'Qualquer gravidade' }}
        actions={{
          onChange: (value: string) => actions.onSeverityChange(value as NetworkSeverity | ''),
        }}
      />
    </FilterField>
    <FilterField data={{ label: 'Andamento' }}>
      <OptionPicker
        data={{ value: data.filter.onlyOpen ? 'yes' : '', options: ONLY_OPEN_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por andamento', allLabel: 'Todos' }}
        actions={{ onChange: (value: string) => actions.onOnlyOpenChange(value === 'yes') }}
      />
    </FilterField>

    <!-- Só aparece quando há o que limpar. Quando o filtro escondeu tudo, quem oferece a
         limpeza é o aviso de lista vazia, logo abaixo — dois botões iguais só confundem. O
         período (no cabeçalho) não conta: ele é o recorte da tela, não um filtro da lista. -->
    <div class="ml-auto flex items-center gap-2">
      {#if hasActiveFilter && !viewState.isFilteredOut}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
      <!-- Trocar entre tabela e cards age sobre a lista logo abaixo: mora aqui, e não no
           cabeçalho da página. -->
      <TableViewToggle />
    </div>
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
    <!-- Lista de cartões para mobile (< xl) -->
    <div
      class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
      data-slot="network-cards-mobile"
    >
      {#each data.events as event (event.id)}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(networkSeverityTone(event.severity))}
          class="hover-fill border-border/70 bg-card rounded-surface border p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge
                data={{ label: networkSeverityLabel(event.severity) }}
                ui={{ tone: networkSeverityTone(event.severity), size: 'sm' }}
              />
              <span class="font-medium text-ink-900 break-words text-sm">
                {networkEventTypeLabel(event.type)}
              </span>
            </div>
            {#if event.resolvedAt}
              <span class="text-ink-700 text-xs shrink-0">{durationLabelOf(event)}</span>
            {:else}
              <StatusBadge data={{ label: 'Em aberto' }} ui={{ tone: 'danger', size: 'sm' }} />
            {/if}
          </div>

          <span class="text-ink-500 block text-xs break-words mt-1">{event.title}</span>
          {#if event.message}
            <span class="text-ink-500 block text-xs break-words mt-0.5">{event.message}</span>
          {/if}

          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-muted-foreground block text-xs">Link</span>
              <span class="text-ink-700 font-medium break-words">{event.linkName ?? '—'}</span>
            </div>
            <div>
              <span class="text-muted-foreground block text-xs">Medidas</span>
              <span class="text-ink-700">{measuresOf(event) || '—'}</span>
            </div>
          </div>

          <div class="border-border/60 mt-3 flex items-center justify-between border-t pt-2">
            <span class="text-ink-500 text-xs">
              {formatDateTime(event.occurredAt)}
            </span>
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
          </div>
        </div>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Monitoramento de instabilidade de rede e link</span>
        <span>{data.events.length} evento(s)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="network-table-desktop"
    >
      <Table class="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>O que houve</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Medidas</TableHead>
            <TableHead>Durou</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.events as event (event.id)}
            <TableRow class="align-top">
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDateTime(event.occurredAt)}
              </TableCell>
              <TableCell class="max-w-[320px]">
                <div class="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    data={{ label: networkSeverityLabel(event.severity) }}
                    ui={{ tone: networkSeverityTone(event.severity), size: 'sm' }}
                  />
                  <span class="font-medium text-ink-900 break-words">
                    {networkEventTypeLabel(event.type)}
                  </span>
                </div>
                <span class="text-ink-500 block text-xs break-words">{event.title}</span>
                {#if event.message}
                  <span class="text-ink-500 block text-xs break-words">{event.message}</span>
                {/if}
              </TableCell>
              <TableCell class="text-ink-700 break-words">{event.linkName ?? '—'}</TableCell>
              <TableCell class="text-ink-700 whitespace-nowrap text-xs">{measuresOf(event) || '—'}</TableCell>
              <TableCell>
                {#if event.resolvedAt}
                  <span class="text-ink-700 text-xs">{durationLabelOf(event)}</span>
                {:else}
                  <StatusBadge data={{ label: 'Em aberto' }} ui={{ tone: 'danger', size: 'sm' }} />
                {/if}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
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
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Monitoramento de instabilidade de rede e link</span>
          <span>{data.events.length} evento(s)</span>
        {/snippet}
      </Table>
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
