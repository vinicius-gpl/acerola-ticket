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
  export type DisposalListViewProps = {
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
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
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
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: DisposalListViewProps = $props();
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Descarte',
      description: 'As máquinas que saíram de uso, e o motivo de cada uma.',
    }}
  />

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
    />
    <StatCard
      data={{ label: 'Lixo', value: data.summary.scrap, hint: 'não ligam mais' }}
      ui={{ tone: 'neutral' }}
    />
  </StatCardGrid>

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState
      data={{ title: 'Não consegui devolver ao inventário', message: viewState.actionError }}
    />
  {/if}

  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome da máquina, apelido ou responsável',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
      <OptionPicker
        data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo de descarte', allLabel: 'Com defeito e lixo' }}
        actions={{ onChange: (value: string) => actions.onTypeChange(value as DisposalType | '') }}
      />
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
    <!-- Lista de cartões para mobile (< md) -->
    <div class="flex flex-col gap-3 md:hidden" data-slot="disposal-cards-mobile">
      {#each data.computers as computer (computer.id)}
        <div class="border-border/70 bg-card rounded-lg border p-4 shadow-xs">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <span class="font-medium text-neutral-900 dark:text-neutral-100 break-words">
                {machineLabelOf(computer)}
              </span>
              <span class="block text-xs text-neutral-400 break-words">
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
            <span class="text-muted-foreground block text-[11px]">Motivo</span>
            <p class="text-neutral-700 dark:text-neutral-200 break-words">
              {computer.disposalReason ?? '—'}
            </p>
          </div>

          <div class="border-border/60 mt-3 flex items-center justify-between border-t pt-2">
            <span class="text-xs text-neutral-400">
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
      <div class="text-muted-foreground flex justify-between px-1 text-xs">
        <span>Máquinas baixadas e arquivadas</span>
        <span>{data.computers.length} registro(s)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= md) -->
    <div class="hidden md:block overflow-x-auto" data-slot="disposal-table-desktop">
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
                <span class="font-medium text-neutral-900 dark:text-neutral-100 break-words">
                  {machineLabelOf(computer)}
                </span>
                <span class="block text-xs text-neutral-400 break-words">
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
              <TableCell class="text-neutral-700 dark:text-neutral-200 max-w-[320px] break-words whitespace-normal">
                {computer.disposalReason ?? '—'}
              </TableCell>
              <TableCell class="text-neutral-400 whitespace-nowrap text-xs">
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
