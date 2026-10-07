<script lang="ts" module>
  import { inventoryUnitShortLabel } from '@template/shared/domain/inventory-catalog.util';
  import {
    disposalReasonLabel,
    disposalReasonOptions,
    type DisposalReason,
  } from '@template/shared/domain/inventory-stock.util';
  import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';

  /**
   * O DESCARTE DA MANUTENÇÃO: o que saiu de uso, quando, quanto e por quê.
   *
   * É um REGISTRO, não um cadastro: descarte não se edita nem se apaga, porque é a prova de
   * para onde foi o que não está mais na prateleira. Por isso a tela só tem um botão — o de
   * registrar outro.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type AcerolaInventoryDisposalListViewProps = {
    data: {
      disposals: InventoryMovement[];
      total: number;
      units: number;
      filter: { reason: DisposalReason | '' };
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      error: string | null;
    };
    actions: {
      onReasonChange: (reason: DisposalReason | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
    };
  };

  const REASON_FILTER_OPTIONS = disposalReasonOptions();
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: listState, actions }: AcerolaInventoryDisposalListViewProps = $props();

  /* "3 descartes · 7 unidades": linhas e unidades são números diferentes, e os dois importam. */
  const summary = $derived(
    `${data.total} ${data.total === 1 ? 'descarte' : 'descartes'} · ${data.units} ${
      data.units === 1 ? 'unidade' : 'unidades'
    }`,
  );
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5">
  <PageHeader
    data={{
      title: 'Descarte',
      description: 'O que saiu de uso, e por quê: quebrou, venceu, sumiu ou não serve mais.',
    }}
  >
    <ActionButton
      data={{ label: 'Registrar descarte' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <div class="rounded-surface border-border bg-card flex flex-wrap items-end gap-x-4 gap-y-3 border p-4 shadow-xs">
    <FilterField data={{ label: 'Motivo' }}>
      <OptionPicker
        data={{ value: data.filter.reason, options: REASON_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por motivo', allLabel: 'Todos os motivos' }}
        actions={{
          onChange: (value: string) => actions.onReasonChange(value as DisposalReason | ''),
        }}
      />
    </FilterField>

    {#if data.filter.reason !== ''}
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'ghost', size: 'lg' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    {/if}
  </div>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar os descartes' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando os descartes…</p>
  {:else if listState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum descarte registrado',
        description: 'Quando algo quebrar, vencer ou sumir, registre aqui para o depósito fechar.',
      }}
      ui={{ icon: Trash2 }}
    >
      <ActionButton
        data={{ label: 'Registrar descarte' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum descarte por esse motivo',
        description: 'Tente outro motivo, ou limpe o filtro para ver todos.',
      }}
      ui={{ icon: Trash2 }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3">
      <p class="text-muted-foreground text-xs">{summary}</p>

      <ul class="flex flex-col gap-3">
        {#each data.disposals as disposal (disposal.id)}
          <li class="rounded-surface border-border bg-card flex flex-col gap-2 border p-4 shadow-xs">
            <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <h3 class="text-ink-900 min-w-0 text-sm leading-tight font-semibold">
                {disposal.itemName}
              </h3>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-ink-900 text-sm font-semibold tabular-nums">
                  {disposal.quantity}
                  {inventoryUnitShortLabel(disposal.itemUnit)}
                </span>
                {#if disposal.reason}
                  <StatusBadge
                    data={{ label: disposalReasonLabel(disposal.reason) }}
                    ui={{ tone: 'danger', size: 'sm' }}
                  />
                {/if}
              </div>
            </div>

            {#if disposal.note}
              <p class="text-ink-700 text-sm">{disposal.note}</p>
            {/if}

            <p class="text-muted-foreground text-xs">
              {formatDate(disposal.createdAt)} · {disposal.createdBy} · ficaram
              {disposal.balanceAfter} no depósito
            </p>
          </li>
        {/each}
      </ul>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os descartes mais recentes. Os mais antigos continuam guardados.
        </p>
      {/if}
    </section>
  {/if}
</div>
