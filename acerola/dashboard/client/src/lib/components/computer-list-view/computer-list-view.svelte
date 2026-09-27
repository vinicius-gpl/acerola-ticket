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
  import { type ReportFormat } from '@template/shared/schemas/report.schema';

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
      exportingFormat?: ReportFormat | null;
      exportError?: string | null;
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
      onExportReport: (format: ReportFormat) => void;
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
  import ReportExportActions from '$lib/components/report-export-actions/report-export-actions.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
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
    <ReportExportActions
      state={{ exportingFormat: state.exportingFormat ?? null }}
      actions={{ onExport: actions.onExportReport }}
    />
    <ActionButton
      data={{ label: 'Cadastrar computador' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  {#if state.exportError}
    <ErrorState data={{ message: state.exportError }} ui={{ variant: 'inline' }} />
  {/if}

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
    <Table class="min-w-[760px]">
      <TableHeader>
        <TableRow>
          <TableHead class="min-w-[240px]">Máquina</TableHead>
          <TableHead class="min-w-[180px]">Responsável</TableHead>
          <TableHead class="min-w-[120px]">Saúde</TableHead>
          <TableHead class="min-w-[120px]">Situação</TableHead>
          <TableHead class="min-w-[110px]">Vista</TableHead>
          <TableHead class="min-w-[100px] text-right"><span class="sr-only">Ações</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each data.computers as computer (computer.id)}
          <TableRow>
            <TableCell class="max-w-[280px]">
              <span class="block font-medium text-neutral-900 dark:text-neutral-100 break-words leading-snug">
                {displayNameOf(computer)}
              </span>
              <span class="block text-xs text-neutral-400 break-words leading-tight mt-0.5">{computer.name}</span>
            </TableCell>
            <TableCell class="max-w-[220px]">
              <span class="block text-neutral-700 dark:text-neutral-200 break-words leading-snug">{computer.responsibleName ?? '—'}</span>
              <span class="block text-xs text-neutral-400 mt-0.5">
                {computer.department ? departmentLabel(computer.department) : 'Sem departamento'}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge
                data={{ label: healthStatusLabel(computer.healthStatus) }}
                ui={{ tone: healthStatusTone(computer.healthStatus), size: 'sm' }}
              />
              <span class="block text-xs text-neutral-400 tabular-nums">
                {computer.healthScore}/100
              </span>
            </TableCell>
            <TableCell>
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
            </TableCell>
            <TableCell class="text-neutral-400 whitespace-nowrap text-xs">
              {formatTimeAgo(computer.lastSeenAt)}
            </TableCell>
            <TableCell class="text-right">
              <ActionButton
                data={{ label: 'Ver ficha' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                actions={{ onClick: () => actions.onOpen(computer) }}
              />
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
      {#snippet footer()}
        <span>Parque de computadores sincronizado com o agente</span>
        <span>{data.computers.length} computador(es) listado(s)</span>
      {/snippet}
    </Table>

    <!-- Truncar calado é mentir sobre o tamanho do parque. -->
    {#if state.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.computers.length} de {data.total} computadores. Use os filtros para chegar
        ao que procura.
      </p>
    {/if}
  {/if}
</div>
