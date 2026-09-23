<script lang="ts" module>
  import {
    HEALTH_STATUSES,
    HEALTH_STATUS_LABELS,
    healthStatusLabel,
    healthStatusTone,
    type HealthStatus,
  } from '@template/shared/domain/computer-health.util';
  import {
    DEPARTMENTS,
    DEPARTMENT_LABELS,
    departmentLabel,
    type Department,
  } from '@template/shared/domain/department.util';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  export type ComputerListFilter = {
    search: string;
    department: Department | '';
    healthStatus: HealthStatus | '';
    includeArchived: boolean;
  };

  export type ComputerSummary = {
    total: number;
    online: number;
    critical: number;
    attention: number;
    neverSeen: number;
  };

  /**
   * O INVENTÁRIO: as máquinas da empresa, da pior saúde para a melhor.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro — estados que, num componente que busca sozinho,
   * só apareceriam desligando o servidor.
   *
   * Não há botão de excluir, e a ausência é a regra do sistema: máquina que saiu de uso é
   * ARQUIVADA, porque é o histórico dela que sustenta "esta aqui deu problema demais, vamos
   * trocar" na hora de decidir compra.
   */
  export type ComputerListViewProps = {
    data: {
      computers: Computer[];
      total: number;
      summary: ComputerSummary | null;
      filter: ComputerListFilter;
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
      onDepartmentChange: (department: Department | '') => void;
      onHealthStatusChange: (healthStatus: HealthStatus | '') => void;
      onArchivedChange: (includeArchived: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onOpen: (computer: Computer) => void;
      onRegister: () => void;
    };
  };

  const DEPARTMENT_FILTER_OPTIONS = [
    { value: '', label: 'Todos os departamentos' },
    ...DEPARTMENTS.map((department) => ({
      value: department,
      label: DEPARTMENT_LABELS[department],
    })),
  ];

  const HEALTH_FILTER_OPTIONS = [
    { value: '', label: 'Toda a saúde' },
    ...HEALTH_STATUSES.map((status) => ({ value: status, label: HEALTH_STATUS_LABELS[status] })),
  ];

  /**
   * O nome que a pessoa reconhece.
   *
   * O apelido dado pelo TI ganha da etiqueta que a máquina informa: quem procura "o
   * computador da recepção" não sabe que ele se chama RECEPCAO-01. O nome técnico continua
   * embaixo, porque é por ele que o agente aparece no log.
   */
  export function displayNameOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.name;
  }
</script>

<script lang="ts">
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import { formatTimeAgo } from '$lib/utils/format-machine';

  let { data, state, actions }: ComputerListViewProps = $props();

  const summary = $derived(data.summary);
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Inventário',
      description: 'Os computadores da empresa, e como cada um está passando.',
    }}
  >
    <ActionButton
      data={{ label: 'Cadastrar computador' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <StatCardGrid>
    <StatCard
      data={{ label: 'Máquinas', value: summary?.total ?? 0 }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: state.isSummaryLoading }}
    />
    <StatCard
      data={{ label: 'Online agora', value: summary?.online ?? 0 }}
      ui={{ tone: 'success' }}
      state={{ isLoading: state.isSummaryLoading }}
    />
    <StatCard
      data={{ label: 'Saúde crítica', value: summary?.critical ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: state.isSummaryLoading }}
    />
    <StatCard
      data={{
        label: 'Em atenção',
        value: summary?.attention ?? 0,
        hint: summary?.neverSeen ? `${summary.neverSeen} sem o agente instalado` : null,
      }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: state.isSummaryLoading }}
    />
  </StatCardGrid>

  <!-- Os filtros ficam juntos e acima da lista, para a pessoa ver de uma vez o que está
       limitando o que ela enxerga. -->
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

    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <SelectField
        data={{ value: data.filter.department, options: DEPARTMENT_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por departamento' }}
        actions={{
          onChange: (value: string) => actions.onDepartmentChange(value as Department | ''),
        }}
      />
      <SelectField
        data={{ value: data.filter.healthStatus, options: HEALTH_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por saúde' }}
        actions={{
          onChange: (value: string) => actions.onHealthStatusChange(value as HealthStatus | ''),
        }}
      />
      <label class="text-ink-700 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="border-ink-300 size-4 rounded"
          checked={data.filter.includeArchived}
          onchange={(event) => actions.onArchivedChange(event.currentTarget.checked)}
        />
        Mostrar máquinas arquivadas
      </label>
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Não consegui carregar o inventário', message: state.error }}
      state={{ isRetrying: state.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os computadores…</p>
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum computador cadastrado',
        description:
          'Cadastre a primeira máquina para gerar o token e instalar o agente nela. A partir daí ela se atualiza sozinha.',
      }}
      ui={{ icon: HardDrive }}
    >
      <ActionButton
        data={{ label: 'Cadastrar computador' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum computador com esses filtros',
        description: 'Tente limpar os filtros para ver o parque inteiro.',
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
            <th scope="col" class="py-2 pr-3">Responsável</th>
            <th scope="col" class="py-2 pr-3">Saúde</th>
            <th scope="col" class="py-2 pr-3">Situação</th>
            <th scope="col" class="py-2 pr-3">Vista</th>
            <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.computers as computer (computer.id)}
            <tr class="hover:bg-muted/40 border-b last:border-0">
              <td class="max-w-[260px] py-2 pr-3">
                <span class="text-ink-900 font-semibold break-words">
                  {displayNameOf(computer)}
                </span>
                <span class="text-ink-500 block text-xs break-words">{computer.name}</span>
              </td>
              <td class="max-w-[200px] py-2 pr-3">
                <span class="text-ink-700 break-words">{computer.responsibleName ?? '—'}</span>
                <span class="text-ink-500 block text-xs">
                  {computer.department ? departmentLabel(computer.department) : 'Sem departamento'}
                </span>
              </td>
              <td class="py-2 pr-3">
                <StatusBadge
                  data={{ label: healthStatusLabel(computer.healthStatus) }}
                  ui={{ tone: healthStatusTone(computer.healthStatus), size: 'sm' }}
                />
                <span class="text-ink-500 block text-xs tabular-nums">
                  {computer.healthScore}/100
                </span>
              </td>
              <td class="py-2 pr-3">
                <!-- Arquivada e bloqueada vêm antes de online/offline: são decisões do TI, e
                     explicam por que a máquina não está enviando nada. -->
                {#if computer.isArchived}
                  <StatusBadge data={{ label: 'Arquivada' }} ui={{ tone: 'neutral', size: 'sm' }} />
                {:else if computer.isBlocked}
                  <StatusBadge data={{ label: 'Bloqueada' }} ui={{ tone: 'danger', size: 'sm' }} />
                {:else if computer.isOnline}
                  <StatusBadge data={{ label: 'Online' }} ui={{ tone: 'success', size: 'sm' }} />
                {:else}
                  <StatusBadge data={{ label: 'Offline' }} ui={{ tone: 'neutral', size: 'sm' }} />
                {/if}
              </td>
              <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                {formatTimeAgo(computer.lastSeenAt)}
              </td>
              <td class="py-2 text-right">
                <ActionButton
                  data={{ label: 'Ver ficha' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onOpen(computer) }}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do parque. -->
    {#if state.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.computers.length} de {data.total} computadores. Use os filtros para chegar
        ao que procura.
      </p>
    {/if}
  {/if}
</div>
