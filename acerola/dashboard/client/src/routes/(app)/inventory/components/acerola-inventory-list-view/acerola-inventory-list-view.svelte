<script lang="ts" module>
  import {
    inventoryCategoryLabel,
    inventoryCategoryOptions,
    inventoryUnitLabel,
  } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  /**
   * O INVENTÁRIO DA MANUTENÇÃO: o que existe no escritório, em cartões com foto.
   *
   * Cartão com imagem, e não tabela: quem cuida do escritório reconhece "aquela cadeira" pela
   * foto antes de ler o nome, e metade do cadastro é coisa que não tem nome oficial nenhum.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro — estados que, num componente que busca sozinho,
   * só apareceriam desligando o servidor.
   */
  export type InventoryListFilterValues = {
    search: string;
    category: InventoryCategory | '';
    withoutPhotoOnly: boolean;
  };

  export type AcerolaInventoryListViewProps = {
    data: {
      items: InventoryItem[];
      total: number;
      filter: InventoryListFilterValues;
      /** O produto esperando confirmação de exclusão — nulo quando não há. */
      deleting: InventoryItem | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isDeleting?: boolean;
      error: string | null;
      deleteError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: InventoryCategory | '') => void;
      onWithoutPhotoOnlyChange: (withoutPhotoOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (item: InventoryItem) => void;
      onAskDelete: (item: InventoryItem) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = inventoryCategoryOptions();
</script>

<script lang="ts">
  import ImageOff from '@lucide/svelte/icons/image-off';
  import Package from '@lucide/svelte/icons/package';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';

  let { data, state: listState, actions }: AcerolaInventoryListViewProps = $props();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' ||
      data.filter.category !== '' ||
      data.filter.withoutPhotoOnly,
  );

  /* A linha de baixo do cartão: onde fica e como é contado, sem repetir rótulo nenhum. */
  function detailOf(item: InventoryItem): string {
    return [item.location, inventoryUnitLabel(item.unit)].filter(Boolean).join(' · ');
  }
</script>

<div class="flex flex-col gap-5 p-5">
  <PageHeader
    data={{
      title: 'Inventário',
      description: 'O que existe no escritório: mobiliário, mercadinho, limpeza e o resto.',
    }}
  >
    <ActionButton
      data={{ label: 'Cadastrar produto' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

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

      <!-- Atalho para terminar o cadastro: ela fotografa o que falta num dia só. -->
      <FilterField data={{ label: 'Foto' }}>
        <OptionPicker
          data={{
            value: data.filter.withoutPhotoOnly ? 'without' : '',
            options: [{ value: 'without', label: 'Sem foto' }],
          }}
          ui={{ ariaLabel: 'Filtrar por foto', allLabel: 'Todos' }}
          actions={{
            onChange: (value: string) => actions.onWithoutPhotoOnlyChange(value === 'without'),
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

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2): a lista só é
       desenhada quando sobrou lista para desenhar. -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o inventário' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando o inventário…</p>
  {:else if listState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum produto cadastrado ainda',
        description: 'Comece pelo que a Manutenção repõe toda semana: café, água, limpeza.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Cadastrar produto' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
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

      <!-- Grade que se ajusta sozinha: um cartão por linha no celular, até quatro no monitor. -->
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each data.items as item (item.id)}
          <li
            class="rounded-surface border-border bg-card flex flex-col overflow-hidden border shadow-xs"
          >
            <div class="bg-muted/40 flex aspect-[4/3] items-center justify-center overflow-hidden">
              {#if item.photoUrl}
                <img
                  src={item.photoUrl}
                  alt={`Foto de ${item.name}`}
                  loading="lazy"
                  class="size-full object-cover"
                />
              {:else}
                <ImageOff class="text-muted-foreground size-6" aria-hidden="true" />
              {/if}
            </div>

            <div class="flex flex-1 flex-col gap-1.5 p-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-ink-900 min-w-0 text-sm leading-tight font-semibold">
                  {item.name}
                </h3>
                <span
                  class="rounded-chip bg-muted text-ink-700 shrink-0 px-2 py-0.5 text-xs font-medium"
                >
                  {inventoryCategoryLabel(item.category)}
                </span>
              </div>

              <p class="text-ink-500 text-xs">{detailOf(item)}</p>

              {#if item.code}
                <p class="text-muted-foreground font-mono text-xs">{item.code}</p>
              {/if}

              {#if item.note}
                <p class="text-ink-700 line-clamp-2 text-xs">{item.note}</p>
              {/if}

              <div class="mt-auto flex items-center justify-end gap-1 pt-2">
                <ActionButton
                  data={{ label: 'Corrigir' }}
                  ui={{ variant: 'ghost', size: 'sm', icon: Pencil, isIconOnly: true }}
                  actions={{ onClick: () => actions.onEdit(item) }}
                />
                <ActionButton
                  data={{ label: 'Excluir' }}
                  ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
                  actions={{ onClick: () => actions.onAskDelete(item) }}
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

<!-- Excluir é irreversível: pergunta antes, com o nome do produto na frase. -->
<ConfirmDialog
  data={{
    title: 'Excluir produto',
    description: data.deleting
      ? `"${data.deleting.name}" sai do inventário. A foto dele também é apagada.`
      : '',
    confirmLabel: 'Excluir',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.deleting !== null,
    isConfirming: listState.isDeleting,
    error: listState.deleteError,
  }}
  actions={{ onConfirm: actions.onConfirmDelete, onCancel: actions.onCancelDelete }}
/>
