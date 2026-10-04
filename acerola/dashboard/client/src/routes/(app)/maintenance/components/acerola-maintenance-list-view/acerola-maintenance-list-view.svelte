<script lang="ts" module>
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
    maintenanceTypeLabel,
    maintenanceTypeTone,
    type MaintenanceType,
  } from '@template/shared/domain/maintenance.util';
  import {
    type Maintenance,
    type PreventiveDue,
  } from '@template/shared/schemas/maintenance.schema';

  export type MaintenanceListFilter = {
    search: string;
    type: MaintenanceType | '';
    computerId: number | null;
  };

  /**
   * O HISTÓRICO DE MANUTENÇÃO: o que já foi feito em cada equipamento, do mais recente para o
   * mais antigo.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * O quadro de preventivas fica ACIMA da lista de propósito: ele responde "o que falta
   * fazer", e a lista responde "o que já foi feito". Quem abre a tela de manhã está atrás da
   * primeira pergunta.
   */
  export type AcerolaMaintenanceListViewProps = {
    data: {
      maintenances: Maintenance[];
      total: number;
      preventive: PreventiveDue[];
      filter: MaintenanceListFilter;
      removing: Maintenance | null;
      paging?: {
        page: number;
        pageSize: number;
        total: number;
      };
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isPreventiveLoading?: boolean;
      isRemoving?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onTypeChange: (type: MaintenanceType | '') => void;
      onPageChange?: (page: number) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: (computerId?: number) => void;
      onEdit: (maintenance: Maintenance) => void;
      onAskRemove: (maintenance: Maintenance) => void;
      onCancelRemove: () => void;
      onConfirmRemove: () => void;
    };
  };

  const TYPE_FILTER_OPTIONS = MAINTENANCE_TYPES.map((type) => ({
    value: type,
    label: MAINTENANCE_TYPE_LABELS[type],
    tone: maintenanceTypeTone(type),
  }));

  /**
   * De quem é este serviço, em uma linha.
   *
   * Máquina do inventário aparece pelo apelido (é como as pessoas a chamam); equipamento de
   * fora aparece pelo que foi digitado. Um registro sempre tem um dos dois — o banco recusa
   * linha sem nenhum.
   */
  export function machineLabelOf(maintenance: Maintenance): string {
    if (maintenance.computerId) {
      return maintenance.computerDisplayName?.trim() || maintenance.computerName || 'Máquina';
    }

    return maintenance.otherMachine ?? 'Equipamento não identificado';
  }
</script>

<script lang="ts">
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PaginationBar from '$lib/components/acerola-pagination-bar/acerola-pagination-bar.svelte';
  import PreventiveBoard from '../acerola-preventive-board/acerola-preventive-board.svelte';
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

  let { data, state: viewState, actions }: AcerolaMaintenanceListViewProps = $props();

  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(Boolean(data.filter.search || data.filter.type));
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Manutenção',
      description: 'O que já foi feito em cada máquina, e o que está para vencer.',
    }}
  >
    <ActionButton
      data={{ label: 'Registrar manutenção' }}
      ui={{ icon: Plus }}
      actions={{ onClick: () => actions.onRegister() }}
    />
  </PageHeader>

  <PreventiveBoard
    data={{ rows: data.preventive }}
    state={{ isLoading: viewState.isPreventiveLoading }}
    actions={{ onRegister: (row) => actions.onRegister(row.computerId) }}
  />

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState data={{ title: 'Não consegui excluir', message: viewState.actionError }} />
  {/if}

  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'O que foi feito, quem fez ou o nome do equipamento',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <!-- O filtro com o nome em cima e, à direita, o que age sobre o histórico logo abaixo:
         limpar os filtros e trocar entre tabela e cards. O seletor de formato morava no
         cabeçalho da página, ao lado de "Registrar manutenção" e acima do quadro de
         preventivas — longe da lista que ele controla. -->
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FilterField data={{ label: 'Tipo' }}>
        <OptionPicker
          data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo', allLabel: 'Todos os tipos' }}
          actions={{
            onChange: (value: string) => actions.onTypeChange(value as MaintenanceType | ''),
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
      data={{ title: 'Não consegui carregar as manutenções', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando as manutenções…</p>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhuma manutenção registrada',
        description:
          'Registre a primeira para começar o histórico. É por ele que se enxerga qual máquina dá trabalho demais.',
      }}
      ui={{ icon: Wrench }}
    >
      <ActionButton
        data={{ label: 'Registrar manutenção' }}
        ui={{ icon: Plus }}
        actions={{ onClick: () => actions.onRegister() }}
      />
    </EmptyState>
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma manutenção com esses filtros',
        description: 'Tente limpar os filtros para ver o histórico inteiro.',
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
      data-slot="maintenance-cards-mobile"
    >
      {#each data.maintenances as maintenance (maintenance.id)}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(maintenanceTypeTone(maintenance.type))}
          class="hover-fill border-border/70 bg-card rounded-surface border p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <span class="block font-medium text-ink-900 break-words leading-snug">
                {machineLabelOf(maintenance)}
              </span>
              <span class="block text-xs text-ink-500 break-words leading-tight mt-0.5">
                {#if maintenance.computerId}
                  {maintenance.computerName}
                  {#if maintenance.computerDepartment}
                    · {departmentLabel(maintenance.computerDepartment)}
                  {/if}
                {:else}
                  Fora do inventário
                {/if}
              </span>
            </div>
            <StatusBadge
              data={{ label: maintenanceTypeLabel(maintenance.type) }}
              ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
            />
          </div>

          <p class="text-ink-700 mt-2 text-sm break-words">
            {maintenance.description ?? '—'}
          </p>

          <div class="mt-2 flex items-center justify-between text-xs text-ink-500">
            <span>{formatDate(maintenance.performedAt)}</span>
            {#if maintenance.performedBy}
              <span>Por: {maintenance.performedBy}</span>
            {/if}
          </div>

          <div class="border-border/60 mt-3 flex items-center justify-end gap-2 border-t pt-2">
            <ActionButton
              data={{ label: 'Corrigir' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onEdit(maintenance) }}
            />
            <ActionButton
              data={{ label: 'Excluir' }}
              ui={{
                variant: 'ghost',
                size: 'sm',
                icon: Trash2,
                isIconOnly: true,
                className: 'text-ink-500 hover:text-destructive hover:bg-destructive/10',
              }}
              actions={{ onClick: () => actions.onAskRemove(maintenance) }}
            />
          </div>
        </div>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Histórico de manutenções</span>
        <span>{data.maintenances.length} registro(s)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="maintenance-table-desktop"
    >
      <Table class="min-w-[840px]">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[110px]">Data</TableHead>
            <TableHead class="min-w-[240px]">Equipamento</TableHead>
            <TableHead class="min-w-[120px]">Tipo</TableHead>
            <TableHead class="min-w-[260px]">O que foi feito</TableHead>
            <TableHead class="min-w-[130px]">Quem fez</TableHead>
            <TableHead class="min-w-[130px] text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.maintenances as maintenance (maintenance.id)}
            <TableRow class="align-top">
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDate(maintenance.performedAt)}
              </TableCell>
              <TableCell class="max-w-[280px]">
                <span class="block font-medium text-ink-900 break-words leading-snug">
                  {machineLabelOf(maintenance)}
                </span>
                <span class="block text-xs text-ink-500 break-words leading-tight mt-0.5">
                  {#if maintenance.computerId}
                    {maintenance.computerName}
                    {#if maintenance.computerDepartment}
                      · {departmentLabel(maintenance.computerDepartment)}
                    {/if}
                  {:else}
                    Fora do inventário
                  {/if}
                </span>
              </TableCell>
              <TableCell class="whitespace-nowrap">
                <StatusBadge
                  data={{ label: maintenanceTypeLabel(maintenance.type) }}
                  ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
                />
              </TableCell>
              <TableCell class="text-ink-700 max-w-[320px] break-words whitespace-normal">
                {maintenance.description ?? '—'}
              </TableCell>
              <TableCell class="text-ink-500 max-w-[140px] break-words whitespace-normal text-xs">{maintenance.performedBy ?? '—'}</TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Corrigir' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onEdit(maintenance) }}
                  />
                  <ActionButton
                    data={{ label: 'Excluir' }}
                    ui={{
                      variant: 'ghost',
                      size: 'sm',
                      icon: Trash2,
                      isIconOnly: true,
                      className: 'text-ink-500 hover:text-destructive hover:bg-destructive/10',
                    }}
                    actions={{ onClick: () => actions.onAskRemove(maintenance) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Histórico de manutenções preventivas e corretivas</span>
          <span>{data.maintenances.length} registro(s)</span>
        {/snippet}
      </Table>
    </div>

    {#if data.paging && data.paging.total > data.paging.pageSize && actions.onPageChange}
      <div class="mt-4">
        <PaginationBar
          data={{
            page: data.paging.page,
            pageSize: data.paging.pageSize,
            total: data.paging.total,
            noun: ['manutenção', 'manutenções'],
          }}
          actions={{
            onPageChange: actions.onPageChange,
          }}
        />
      </div>
    {/if}

    <!-- Truncar calado é mentir sobre o tamanho do histórico. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.maintenances.length} de {data.total} manutenções. Use os filtros para chegar
        ao que procura.
      </p>
    {/if}
  {/if}
</div>

<ConfirmDialog
  data={{
    title: 'Excluir esta manutenção?',
    description: data.removing
      ? `O registro de ${formatDate(data.removing.performedAt)} em ${machineLabelOf(data.removing)} sai do histórico. Não dá para desfazer.`
      : '',
    confirmLabel: 'Excluir manutenção',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.removing !== null,
    isConfirming: viewState.isRemoving,
    error: viewState.actionError,
  }}
  actions={{ onConfirm: actions.onConfirmRemove, onCancel: actions.onCancelRemove }}
/>
