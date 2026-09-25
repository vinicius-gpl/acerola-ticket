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

  const TYPE_FILTER_OPTIONS = [
    { value: '', label: 'Com defeito e lixo' },
    ...DISPOSAL_TYPES.map((type) => ({ value: type, label: DISPOSAL_TYPE_LABELS[type] })),
  ];

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
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
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

    <div class="grid gap-2 sm:grid-cols-2">
      <SelectField
        data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo de descarte' }}
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
    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="text-ink-500 border-b text-xs uppercase">
          <tr>
            <th scope="col" class="py-2 pr-3">Máquina</th>
            <th scope="col" class="py-2 pr-3">Tipo</th>
            <th scope="col" class="py-2 pr-3">Motivo</th>
            <th scope="col" class="py-2 pr-3">Saiu em</th>
            <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.computers as computer (computer.id)}
            <tr class="hover:bg-muted/40 border-b last:border-0 align-top">
              <td class="max-w-[240px] py-2 pr-3">
                <span class="text-ink-900 font-semibold break-words">
                  {machineLabelOf(computer)}
                </span>
                <span class="text-ink-500 block text-xs break-words">
                  {computer.name}
                  {#if computer.department}
                    · {departmentLabel(computer.department)}
                  {/if}
                </span>
              </td>
              <td class="py-2 pr-3">
                {#if computer.disposalType}
                  <StatusBadge
                    data={{ label: disposalTypeLabel(computer.disposalType) }}
                    ui={{ tone: disposalTypeTone(computer.disposalType), size: 'sm' }}
                  />
                {/if}
              </td>
              <td class="text-ink-700 max-w-[320px] py-2 pr-3 break-words">
                {computer.disposalReason ?? '—'}
              </td>
              <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                {formatDate(computer.disposedAt)}
              </td>
              <td class="py-2 text-right whitespace-nowrap">
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
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
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
