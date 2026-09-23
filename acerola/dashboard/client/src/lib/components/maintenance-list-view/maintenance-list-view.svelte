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
  export type MaintenanceListViewProps = {
    data: {
      maintenances: Maintenance[];
      total: number;
      preventive: PreventiveDue[];
      filter: MaintenanceListFilter;
      removing: Maintenance | null;
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
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: (computerId?: number) => void;
      onEdit: (maintenance: Maintenance) => void;
      onAskRemove: (maintenance: Maintenance) => void;
      onCancelRemove: () => void;
      onConfirmRemove: () => void;
    };
  };

  const TYPE_FILTER_OPTIONS = [
    { value: '', label: 'Todos os tipos' },
    ...MAINTENANCE_TYPES.map((type) => ({ value: type, label: MAINTENANCE_TYPE_LABELS[type] })),
  ];

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
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import PreventiveBoard from '$lib/components/preventive-board/preventive-board.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: MaintenanceListViewProps = $props();
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

    <div class="grid gap-2 sm:grid-cols-2">
      <SelectField
        data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo' }}
        actions={{ onChange: (value: string) => actions.onTypeChange(value as MaintenanceType | '') }}
      />
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
    <div class="overflow-x-auto">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead class="text-ink-500 border-b text-xs uppercase">
          <tr>
            <th scope="col" class="py-2 pr-3">Data</th>
            <th scope="col" class="py-2 pr-3">Equipamento</th>
            <th scope="col" class="py-2 pr-3">Tipo</th>
            <th scope="col" class="py-2 pr-3">O que foi feito</th>
            <th scope="col" class="py-2 pr-3">Quem fez</th>
            <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.maintenances as maintenance (maintenance.id)}
            <tr class="hover:bg-muted/40 border-b last:border-0 align-top">
              <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                {formatDate(maintenance.performedAt)}
              </td>
              <td class="max-w-[220px] py-2 pr-3">
                <span class="text-ink-900 font-semibold break-words">
                  {machineLabelOf(maintenance)}
                </span>
                <span class="text-ink-500 block text-xs break-words">
                  {#if maintenance.computerId}
                    {maintenance.computerName}
                    {#if maintenance.computerDepartment}
                      · {departmentLabel(maintenance.computerDepartment)}
                    {/if}
                  {:else}
                    Fora do inventário
                  {/if}
                </span>
              </td>
              <td class="py-2 pr-3">
                <StatusBadge
                  data={{ label: maintenanceTypeLabel(maintenance.type) }}
                  ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
                />
              </td>
              <td class="text-ink-700 max-w-[320px] py-2 pr-3 break-words">
                {maintenance.description ?? '—'}
              </td>
              <td class="text-ink-500 py-2 pr-3 break-words">{maintenance.performedBy ?? '—'}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <ActionButton
                  data={{ label: 'Corrigir' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onEdit(maintenance) }}
                />
                <ActionButton
                  data={{ label: 'Excluir' }}
                  ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
                  actions={{ onClick: () => actions.onAskRemove(maintenance) }}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

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
