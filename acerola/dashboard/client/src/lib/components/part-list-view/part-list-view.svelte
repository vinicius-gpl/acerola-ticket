<script lang="ts" module>
  import {
    PART_CATEGORIES,
    PART_CATEGORY_LABELS,
    PART_CONDITIONS,
    PART_CONDITION_LABELS,
    partCategoryLabel,
    partConditionLabel,
    partConditionTone,
    type PartCategory,
    type PartCondition,
  } from '@template/shared/domain/part-catalog.util';
  import { type Part } from '@template/shared/schemas/part.schema';

  export type PartListFilter = {
    search: string;
    category: PartCategory | '';
    condition: PartCondition | '';
    inStockOnly: boolean;
  };

  export type PartSummary = { kinds: number; items: number; outOfStock: number };

  /**
   * O DEPÓSITO: as peças de reposição que a TI tem em mãos.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * Peça com saldo zero NÃO some da lista: é por ela que alguém descobre o que precisa
   * comprar. Ela aparece com o saldo em vermelho, e o filtro "só com estoque" é quem a
   * esconde — quando a pergunta for outra.
   */
  export type PartListViewProps = {
    data: {
      parts: Part[];
      total: number;
      summary: PartSummary | null;
      filter: PartListFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isSummaryLoading?: boolean;
      error: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: PartCategory | '') => void;
      onConditionChange: (condition: PartCondition | '') => void;
      onInStockOnlyChange: (inStockOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (part: Part) => void;
      onMove: (part: Part, type: 'in' | 'out') => void;
      onOpenLedger: (part: Part) => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = PART_CATEGORIES.map((category) => ({
    value: category,
    label: PART_CATEGORY_LABELS[category],
  }));

  const CONDITION_FILTER_OPTIONS = PART_CONDITIONS.map((condition) => ({
    value: condition,
    label: PART_CONDITION_LABELS[condition],
    tone: partConditionTone(condition),
  }));
</script>

<script lang="ts">
  import Package from '@lucide/svelte/icons/package';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: PartListViewProps = $props();

  const summary = $derived(data.summary);
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Depósito',
      description: 'As peças de reposição que a TI tem em mãos.',
    }}
  >
    <ActionButton
      data={{ label: 'Cadastrar peça' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <StatCardGrid>
    <StatCard
      data={{ label: 'Tipos de peça', value: summary?.kinds ?? 0 }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
    <StatCard
      data={{ label: 'Peças na prateleira', value: summary?.items ?? 0 }}
      ui={{ tone: 'success' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
    <StatCard
      data={{
        label: 'Sem estoque',
        value: summary?.outOfStock ?? 0,
        hint: summary?.outOfStock ? 'são as que podem precisar de compra' : null,
      }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: viewState.isSummaryLoading }}
    />
  </StatCardGrid>

  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Descrição da peça',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <OptionPicker
          data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
          actions={{
            onChange: (value: string) => actions.onCategoryChange(value as PartCategory | ''),
          }}
        />
        <OptionPicker
          data={{ value: data.filter.condition, options: CONDITION_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por condição', allLabel: 'Novas e usadas' }}
          actions={{
            onChange: (value: string) => actions.onConditionChange(value as PartCondition | ''),
          }}
        />
      </div>
      <label class="text-ink-700 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="border-ink-300 size-4 rounded"
          checked={data.filter.inStockOnly}
          onchange={(event) => actions.onInStockOnlyChange(event.currentTarget.checked)}
        />
        Só o que tem na prateleira
      </label>
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar o depósito', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando as peças…</p>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhuma peça cadastrada',
        description:
          'Cadastre a primeira peça para começar a controlar o que entra e o que sai da prateleira.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Cadastrar peça' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma peça com esses filtros',
        description: 'Tente limpar os filtros para ver o depósito inteiro.',
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
    <!-- Lista de cartões para mobile (< md) -->
    <div class="flex flex-col gap-3 md:hidden" data-slot="part-cards-mobile">
      {#each data.parts as part (part.id)}
        <div class="border-border/70 bg-card rounded-lg border p-4 shadow-xs">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <button
                type="button"
                class="font-medium text-neutral-900 dark:text-neutral-100 text-left break-words hover:underline"
                onclick={() => actions.onOpenLedger(part)}
              >
                {part.name}
              </button>
              <span class="text-neutral-400 block text-xs">Ver o histórico</span>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge
                data={{ label: partConditionLabel(part.condition) }}
                ui={{ tone: partConditionTone(part.condition), size: 'sm' }}
              />
              <span
                class={cn(
                  'text-base font-semibold tabular-nums',
                  part.balance === 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100',
                )}
              >
                {part.balance} <span class="text-xs font-normal text-muted-foreground">na prateleira</span>
              </span>
            </div>
          </div>

          <div class="mt-2 text-xs">
            <span class="text-muted-foreground">Categoria: </span>
            <span class="text-neutral-700 dark:text-neutral-200 font-medium">{partCategoryLabel(part.category)}</span>
          </div>

          <div class="border-border/60 mt-3 flex items-center justify-end gap-2 border-t pt-2">
            <ActionButton
              data={{ label: 'Entrada' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onMove(part, 'in') }}
            />
            <ActionButton
              data={{ label: 'Saída' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              state={{ isDisabled: part.balance === 0 }}
              actions={{ onClick: () => actions.onMove(part, 'out') }}
            />
            <ActionButton
              data={{ label: 'Corrigir' }}
              ui={{ variant: 'ghost', size: 'sm' }}
              actions={{ onClick: () => actions.onEdit(part) }}
            />
          </div>
        </div>
      {/each}
      <div class="text-muted-foreground flex justify-between px-1 text-xs">
        <span>Controle de estoque</span>
        <span>{data.parts.length} item(ns)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= md) -->
    <div class="hidden md:block overflow-x-auto" data-slot="part-table-desktop">
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Peça</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Condição</TableHead>
            <TableHead>Na prateleira</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.parts as part (part.id)}
            <TableRow class="align-top">
              <!-- `style` (não classe) força a quebra de linha: o componente baixado do
                   `ui/table` deixa toda célula com botão dentro em `white-space: nowrap`, e um
                   nome comprido de peça atropelava a coluna de categoria (CONTRIBUTING §5: não
                   se edita o componente baixado). Estilo inline vence a classe sem tocar nele. -->
              <TableCell class="max-w-[280px]" style="white-space: normal;">
                <button
                  type="button"
                  class="font-medium text-neutral-900 dark:text-neutral-100 text-left break-words hover:underline"
                  onclick={() => actions.onOpenLedger(part)}
                >
                  {part.name}
                </button>
                <span class="text-neutral-400 block text-xs">Ver o histórico desta peça</span>
              </TableCell>
              <TableCell class="text-neutral-700 dark:text-neutral-200">{partCategoryLabel(part.category)}</TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: partConditionLabel(part.condition) }}
                  ui={{ tone: partConditionTone(part.condition), size: 'sm' }}
                />
              </TableCell>
              <TableCell
                class={cn(
                  'text-base font-semibold tabular-nums',
                  part.balance === 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100',
                )}
              >
                {part.balance}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Entrada' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onMove(part, 'in') }}
                  />
                  <ActionButton
                    data={{ label: 'Saída' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    state={{ isDisabled: part.balance === 0 }}
                    actions={{ onClick: () => actions.onMove(part, 'out') }}
                  />
                  <ActionButton
                    data={{ label: 'Corrigir' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: () => actions.onEdit(part) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Controle de estoque e saldo de prateleira</span>
          <span>{data.parts.length} item(ns)</span>
        {/snippet}
      </Table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do depósito. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.parts.length} de {data.total} peças. Use os filtros para chegar ao que
        procura.
      </p>
    {/if}
  {/if}
</div>
