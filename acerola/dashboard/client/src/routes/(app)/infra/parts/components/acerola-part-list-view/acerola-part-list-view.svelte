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
    outOfStockOnly: boolean;
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
  export type AcerolaPartListViewProps = {
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
      onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
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

  /** "Estoque": a opção sem valor ("Todas") vem do `allLabel` do seletor. */
  const STOCK_OPTIONS = [
    { value: 'in', label: 'Com estoque', tone: 'success' as const },
    { value: 'out', label: 'Sem estoque', tone: 'danger' as const },
  ];

  /** As duas chaves do filtro (`inStockOnly`/`outOfStockOnly`) como UMA escolha de três. */
  function stockValueOf(filter: PartListFilter): string {
    if (filter.inStockOnly) return 'in';

    return filter.outOfStockOnly ? 'out' : '';
  }
</script>

<script lang="ts">
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Package from '@lucide/svelte/icons/package';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

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
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: AcerolaPartListViewProps = $props();

  const summary = $derived(data.summary);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    Boolean(
      data.filter.search ||
        data.filter.category ||
        data.filter.condition ||
        data.filter.inStockOnly ||
        data.filter.outOfStockOnly,
    ),
  );

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  /* O filtro de estoque, vindo das pastilhas ou de um cartão do topo. Escolher o que já está
     valendo (clicar de novo no cartão) tira o filtro. */
  function chooseStock(value: string) {
    const next = value === stockValueOf(data.filter) ? '' : value;

    if (next === 'in') return actions.onInStockOnlyChange(true);
    if (next === 'out') return actions.onOutOfStockOnlyChange(true);

    actions.onInStockOnlyChange(false);
    actions.onOutOfStockOnlyChange(false);
  }

  function chooseStockFromCard(value: 'in' | 'out') {
    chooseStock(value);

    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    filtersElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
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
    <!-- Estes dois são ATALHOS do filtro de estoque: "Peças na prateleira" mostra só o que tem
         saldo, "Sem estoque" só o que está zerado. Clicar de novo desliga. "Tipos de peça" é o
         total do cadastro — não filtra nada. -->
    <StatCard
      data={{ label: 'Peças na prateleira', value: summary?.items ?? 0 }}
      ui={{ tone: 'success' }}
      state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.inStockOnly }}
      actions={{ onClick: () => chooseStockFromCard('in') }}
    />
    <StatCard
      data={{
        label: 'Sem estoque',
        value: summary?.outOfStock ?? 0,
        hint: summary?.outOfStock ? 'são as que podem precisar de compra' : null,
      }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.outOfStockOnly }}
      actions={{ onClick: () => chooseStockFromCard('out') }}
    />
  </StatCardGrid>

  <div bind:this={filtersElement} class="flex scroll-mt-4 flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Descrição da peça',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <!-- Uma fileira, cada filtro com o nome em cima. "Estoque" era uma caixa de seleção solta
         embaixo dos outros; agora é um filtro como os demais, com as duas escolhas à vista. -->
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FilterField data={{ label: 'Categoria' }}>
        <OptionPicker
          data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
          actions={{
            onChange: (value: string) => actions.onCategoryChange(value as PartCategory | ''),
          }}
        />
      </FilterField>
      <FilterField data={{ label: 'Condição' }}>
        <OptionPicker
          data={{ value: data.filter.condition, options: CONDITION_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por condição', allLabel: 'Novas e usadas' }}
          actions={{
            onChange: (value: string) => actions.onConditionChange(value as PartCondition | ''),
          }}
        />
      </FilterField>
      <FilterField data={{ label: 'Estoque' }}>
        <OptionPicker
          data={{ value: stockValueOf(data.filter), options: STOCK_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por estoque', allLabel: 'Todas' }}
          actions={{ onChange: chooseStock }}
        />
      </FilterField>

      <!-- À direita, o que age sobre a lista logo abaixo. "Limpar filtros" só aparece quando há
           o que limpar; quando o filtro escondeu tudo, quem o oferece é o aviso de lista vazia
           — dois botões iguais só confundem. -->
      <div class="ml-auto flex items-center gap-2">
        {#if hasActiveFilter && !viewState.isFilteredOut}
          <ActionButton
            data={{ label: 'Limpar filtros' }}
            ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
            actions={{ onClick: actions.onClearFilters }}
          />
        {/if}
        <TableViewToggle />
      </div>
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
    <!-- Lista de cartões para mobile (< xl) -->
    <div
      class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
      data-slot="part-cards-mobile"
    >
      {#each data.parts as part (part.id)}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(partConditionTone(part.condition))}
          class="hover-fill border-border/70 bg-card rounded-surface border p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <button
                type="button"
                class="font-medium text-ink-900 text-left break-words hover:underline"
                onclick={() => actions.onOpenLedger(part)}
              >
                {part.name}
              </button>
              <span class="text-ink-500 block text-xs">Ver o histórico</span>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge
                data={{ label: partConditionLabel(part.condition) }}
                ui={{ tone: partConditionTone(part.condition), size: 'sm' }}
              />
              <span
                class={cn(
                  'text-base font-semibold tabular-nums',
                  part.balance === 0 ? 'text-destructive' : 'text-ink-900',
                )}
              >
                {part.balance} <span class="text-xs font-normal text-muted-foreground">na prateleira</span>
              </span>
            </div>
          </div>

          <div class="mt-2 text-xs">
            <span class="text-muted-foreground">Categoria: </span>
            <span class="text-ink-700 font-medium">{partCategoryLabel(part.category)}</span>
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
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Controle de estoque</span>
        <span>{data.parts.length} item(ns)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="part-table-desktop"
    >
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
                  class="font-medium text-ink-900 text-left break-words hover:underline"
                  onclick={() => actions.onOpenLedger(part)}
                >
                  {part.name}
                </button>
                <span class="text-ink-500 block text-xs">Ver o histórico desta peça</span>
              </TableCell>
              <TableCell class="text-ink-700">{partCategoryLabel(part.category)}</TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: partConditionLabel(part.condition) }}
                  ui={{ tone: partConditionTone(part.condition), size: 'sm' }}
                />
              </TableCell>
              <TableCell
                class={cn(
                  'text-base font-semibold tabular-nums',
                  part.balance === 0 ? 'text-destructive' : 'text-ink-900',
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
