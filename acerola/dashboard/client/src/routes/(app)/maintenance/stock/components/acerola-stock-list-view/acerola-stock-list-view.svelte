<script lang="ts" module>
  import {
    inventoryCategoryLabel,
    inventoryCategoryOptions,
    inventoryUnitLabel,
    type InventoryCategory,
  } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  /**
   * O DEPÓSITO DA MANUTENÇÃO: quanto há de cada produto, e os dois botões que mudam o número.
   *
   * São os mesmos produtos do Inventário, lidos de outro jeito: lá importa O QUE é o produto
   * (foto, lugar, etiqueta), aqui importa QUANTO há. Por isso o número é a maior coisa do
   * cartão, e a foto nem aparece.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type StockListFilterValues = {
    search: string;
    category: InventoryCategory | '';
    outOfStockOnly: boolean;
  };

  export type AcerolaStockListViewProps = {
    data: {
      items: InventoryItem[];
      total: number;
      outOfStock: number;
      filter: StockListFilterValues;
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
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: InventoryCategory | '') => void;
      onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onEntry: (item: InventoryItem) => void;
      onExit: (item: InventoryItem) => void;
      onOpenInventory: () => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = inventoryCategoryOptions();
</script>

<script lang="ts">
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Package from '@lucide/svelte/icons/package';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';

  let { data, state: listState, actions }: AcerolaStockListViewProps = $props();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' || data.filter.category !== '' || data.filter.outOfStockOnly,
  );

  /* O atalho mostra quantos zeraram: é o número que faz a pessoa clicar nele. */
  const outOfStockLabel = $derived(
    data.outOfStock > 0 ? `Sem estoque (${data.outOfStock})` : 'Sem estoque',
  );

  /* A linha de baixo do nome: categoria e lugar, sem repetir rótulo nenhum. */
  function detailOf(item: InventoryItem): string {
    return [inventoryCategoryLabel(item.category), item.location].filter(Boolean).join(' · ');
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5">
  <PageHeader
    data={{
      title: 'Depósito',
      description: 'Quanto há de cada produto. Entrada soma, saída tira — e o número se explica.',
    }}
  />

  <div class="rounded-surface border-border bg-card flex flex-col gap-3 border p-4 shadow-xs">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome do produto, onde fica ou código de patrimônio',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FilterField data={{ label: 'Categoria' }}>
        <OptionPicker
          data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
          actions={{
            onChange: (value: string) => actions.onCategoryChange(value as InventoryCategory | ''),
          }}
        />
      </FilterField>

      <!-- A lista de compras da semana: só o que zerou. -->
      <FilterField data={{ label: 'Estoque' }}>
        <OptionPicker
          data={{
            value: data.filter.outOfStockOnly ? 'empty' : '',
            options: [{ value: 'empty', label: outOfStockLabel }],
          }}
          ui={{ ariaLabel: 'Filtrar por estoque', allLabel: 'Todos' }}
          actions={{
            onChange: (value: string) => actions.onOutOfStockOnlyChange(value === 'empty'),
          }}
        />
      </FilterField>

      {#if hasActiveFilter}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'lg' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </div>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o depósito' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando o depósito…</p>
  {:else if listState.isEmpty}
    <!-- Depósito vazio é inventário vazio: o produto nasce lá, e só depois ganha estoque. -->
    <EmptyState
      data={{
        title: 'Nenhum produto para guardar ainda',
        description: 'O depósito conta os produtos do inventário. Cadastre o primeiro por lá.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton data={{ label: 'Abrir o inventário' }} actions={{ onClick: actions.onOpenInventory }} />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum produto com esse filtro',
        description: 'Tente outra categoria, ou limpe o filtro para ver tudo.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3">
      <p class="text-muted-foreground text-xs">
        {data.total}
        {data.total === 1 ? 'produto' : 'produtos'}
      </p>

      <!-- Uma coluna no celular, duas no tablet, três no monitor: o número precisa de espaço. -->
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {#each data.items as item (item.id)}
          <li class="rounded-surface border-border bg-card flex flex-col gap-3 border p-4 shadow-xs">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-ink-900 text-sm leading-tight font-semibold">{item.name}</h3>
                <p class="text-ink-500 mt-1 text-xs">{detailOf(item)}</p>
              </div>

              <div class="shrink-0 text-right">
                <p class="text-ink-900 text-2xl leading-none font-semibold tabular-nums">
                  {item.balance}
                </p>
                <p class="text-muted-foreground mt-1 text-xs">{inventoryUnitLabel(item.unit)}</p>
              </div>
            </div>

            <div class="mt-auto flex flex-wrap items-center justify-between gap-2">
              {#if item.balance === 0}
                <StatusBadge data={{ label: 'Sem estoque' }} ui={{ tone: 'danger', size: 'sm' }} />
              {:else}
                <span></span>
              {/if}

              <div class="flex items-center gap-2">
                <ActionButton
                  data={{ label: 'Entrada' }}
                  ui={{ variant: 'secondary', size: 'sm', icon: ArrowDownLeft }}
                  actions={{ onClick: () => actions.onEntry(item) }}
                />
                <!-- Sem estoque não há o que tirar: o botão fica apagado em vez de abrir um
                     diálogo que só serviria para o servidor recusar. -->
                <ActionButton
                  data={{ label: 'Saída' }}
                  ui={{ variant: 'secondary', size: 'sm', icon: ArrowUpRight }}
                  state={{ isDisabled: item.balance === 0 }}
                  actions={{ onClick: () => actions.onExit(item) }}
                />
              </div>
            </div>
          </li>
        {/each}
      </ul>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os primeiros produtos. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>
