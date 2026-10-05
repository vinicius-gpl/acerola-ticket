<script lang="ts" module>
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    DISPOSAL_TYPES,
    DISPOSAL_TYPE_LABELS,
    disposalTypeLabel,
    disposalTypeTone,
    type DisposalType,
  } from '@template/shared/domain/disposal.util';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  export type DisposalFilter = { search: string; type: DisposalType | '' };

  export type DisposalSummary = { total: number; defect: number; scrap: number };

  /**
   * O DESCARTE: as máquinas que saíram de uso, e o motivo de cada uma.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * Aqui não se descarta nada — isso acontece na FICHA da máquina, que é onde a pessoa está
   * olhando quando decide. Esta tela é o histórico, e a única escrita dela é desfazer.
   */
  export type AcerolaDisposalListViewProps = {
    data: {
      computers: Computer[];
      total: number;
      summary: DisposalSummary;
      filter: DisposalFilter;
      restoring: Computer | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isRestoring?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onTypeChange: (type: DisposalType | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onOpenMachine: (computer: Computer) => void;
      onAskRestore: (computer: Computer) => void;
      onCancelRestore: () => void;
      onConfirmRestore: () => void;
    };
  };

  const TYPE_FILTER_OPTIONS = DISPOSAL_TYPES.map((type) => ({
    value: type,
    label: DISPOSAL_TYPE_LABELS[type],
    tone: disposalTypeTone(type),
  }));

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.name;
  }
</script>

<script lang="ts">
  import FilterX from '@lucide/svelte/icons/filter-x';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
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
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AcerolaDisposalListViewProps = $props();

  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(Boolean(data.filter.search || data.filter.type));

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  function filterByType(type: DisposalType) {
    actions.onTypeChange(data.filter.type === type ? '' : type);

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
      title: 'Descarte',
      description: 'As máquinas que saíram de uso, e o motivo de cada uma.',
    }}
  />

  <!-- "Com defeito" e "Lixo" são ATALHOS do filtro de tipo: clicar liga o mesmo filtro das
       pastilhas, clicar de novo desliga. "Máquinas fora de uso" é o total — não filtra nada. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Máquinas fora de uso', value: data.summary.total }}
      ui={{ tone: 'neutral' }}
    />
    <StatCard
      data={{
        label: 'Com defeito',
        value: data.summary.defect,
        hint: 'ainda rendem peça ou conserto',
      }}
      ui={{ tone: 'warning' }}
      state={{ isSelected: data.filter.type === 'defect' }}
      actions={{ onClick: () => filterByType('defect') }}
    />
    <StatCard
      data={{ label: 'Lixo', value: data.summary.scrap, hint: 'não ligam mais' }}
      ui={{ tone: 'neutral' }}
      state={{ isSelected: data.filter.type === 'scrap' }}
      actions={{ onClick: () => filterByType('scrap') }}
    />
  </StatCardGrid>

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState
      data={{ title: 'Não consegui devolver ao inventário', message: viewState.actionError }}
    />
  {/if}

  <div bind:this={filtersElement} class="flex scroll-mt-4 flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome da máquina, apelido ou responsável',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <!-- O filtro com o nome em cima e, à direita, o que age sobre a lista logo abaixo: limpar
         os filtros e trocar entre tabela e cards. -->
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FilterField data={{ label: 'Tipo de descarte' }}>
        <OptionPicker
          data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo de descarte', allLabel: 'Com defeito e lixo' }}
          actions={{
            onChange: (value: string) => actions.onTypeChange(value as DisposalType | ''),
          }}
        />
      </FilterField>

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
      data={{ title: 'Não consegui carregar o descarte', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando o que saiu de uso…</p>
  {:else if viewState.isEmpty}
    <!-- Nada descartado é uma boa notícia, e o texto diz onde a ação acontece. -->
    <EmptyState
      data={{
        title: 'Nenhuma máquina descartada',
        description:
          'Quando um computador sair de uso, descarte ele pela ficha dele, no Inventário — com o motivo. Ele aparece aqui, sem perder o histórico.',
      }}
      ui={{ icon: Trash2 }}
    />
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma máquina com esses filtros',
        description: 'Tente limpar os filtros para ver tudo o que saiu de uso.',
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
      data-slot="disposal-cards-mobile"
    >
      {#each data.computers as computer (computer.id)}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(
            computer.disposalType ? disposalTypeTone(computer.disposalType) : 'neutral',
          )}
          class="hover-fill border-border/70 bg-card rounded-surface border p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <span class="font-medium text-ink-900 break-words">
                {machineLabelOf(computer)}
              </span>
              <span class="block text-xs text-ink-500 break-words">
                {computer.name}
                {#if computer.department}
                  · {departmentLabel(computer.department)}
                {/if}
              </span>
            </div>
            {#if computer.disposalType}
              <StatusBadge
                data={{ label: disposalTypeLabel(computer.disposalType) }}
                ui={{ tone: disposalTypeTone(computer.disposalType), size: 'sm' }}
              />
            {/if}
          </div>

          <div class="mt-2 text-xs">
            <span class="text-muted-foreground block text-xs">Motivo</span>
            <p class="text-ink-700 break-words">
              {computer.disposalReason ?? '—'}
            </p>
          </div>

          <div class="border-border/60 mt-3 flex items-center justify-between border-t pt-2">
            <span class="text-xs text-ink-500">
              Saiu em {formatDate(computer.disposedAt)}
            </span>
            <div class="flex items-center gap-1">
              <ActionButton
                data={{ label: 'Ver ficha' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                actions={{ onClick: () => actions.onOpenMachine(computer) }}
              />
              <ActionButton
                data={{ label: 'Voltar ao inventário' }}
                ui={{ variant: 'ghost', size: 'sm' }}
                actions={{ onClick: () => actions.onAskRestore(computer) }}
              />
            </div>
          </div>
        </div>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Máquinas baixadas e arquivadas</span>
        <span>{data.computers.length} registro(s)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="disposal-table-desktop"
    >
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Máquina</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Saiu em</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.computers as computer (computer.id)}
            <TableRow class="align-top">
              <TableCell class="max-w-[240px]">
                <span class="font-medium text-ink-900 break-words">
                  {machineLabelOf(computer)}
                </span>
                <span class="block text-xs text-ink-500 break-words">
                  {computer.name}
                  {#if computer.department}
                    · {departmentLabel(computer.department)}
                  {/if}
                </span>
              </TableCell>
              <TableCell>
                {#if computer.disposalType}
                  <StatusBadge
                    data={{ label: disposalTypeLabel(computer.disposalType) }}
                    ui={{ tone: disposalTypeTone(computer.disposalType), size: 'sm' }}
                  />
                {/if}
              </TableCell>
              <TableCell class="text-ink-700 max-w-[320px] break-words whitespace-normal">
                {computer.disposalReason ?? '—'}
              </TableCell>
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDate(computer.disposedAt)}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Ver ficha' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpenMachine(computer) }}
                  />
                  <ActionButton
                    data={{ label: 'Voltar ao inventário' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: () => actions.onAskRestore(computer) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Máquinas baixadas e arquivadas</span>
          <span>{data.computers.length} registro(s)</span>
        {/snippet}
      </Table>
    </div>
  {/if}
</div>

<ConfirmDialog
  data={{
    title: 'Devolver esta máquina ao inventário?',
    description: data.restoring
      ? `${machineLabelOf(data.restoring)} volta para as listas do dia a dia, e o motivo do descarte é apagado. O histórico dela continua inteiro.`
      : '',
    confirmLabel: 'Voltar ao inventário',
    confirmingLabel: 'Devolvendo…',
  }}
  state={{
    isOpen: data.restoring !== null,
    isConfirming: viewState.isRestoring,
    error: viewState.actionError,
  }}
  actions={{ onConfirm: actions.onConfirmRestore, onCancel: actions.onCancelRestore }}
/>
