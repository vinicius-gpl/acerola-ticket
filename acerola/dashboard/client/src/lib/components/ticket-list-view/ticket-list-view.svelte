<script lang="ts" module>
  import {
    TICKET_DEPARTMENTS,
    TICKET_DEPARTMENT_LABELS,
    TICKET_PROBLEM_TYPE_LABELS,
    TICKET_PROBLEM_TYPES,
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
    type TicketDepartment,
    type TicketProblemType,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_STATUSES,
    ticketPriorityLabel,
    ticketPriorityTone,
    ticketStatusLabel,
    ticketStatusTone,
    type TicketPriority,
    type TicketStatus,
  } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type TicketDashboard } from '$lib/api/tickets.api';

  export type TicketListFilter = {
    search: string;
    status: TicketStatus | '';
    priority: TicketPriority | '';
    department: TicketDepartment | '';
    problemType: TicketProblemType | '';
  };

  /**
   * A fila de chamados do painel do TI.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro — estados que, num componente que busca sozinho,
   * só apareceriam desligando o servidor.
   *
   * Não há botão de excluir, e a ausência é a regra do sistema: chamado sai da fila mudando
   * de situação, nunca sumindo.
   */
  export type TicketListViewProps = {
    data: {
      tickets: Ticket[];
      total: number;
      dashboard: TicketDashboard | null;
      filter: TicketListFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isDashboardLoading?: boolean;
      error: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onStatusChange: (status: TicketStatus | '') => void;
      onPriorityChange: (priority: TicketPriority | '') => void;
      onDepartmentChange: (department: TicketDepartment | '') => void;
      onProblemTypeChange: (problemType: TicketProblemType | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onAnswer: (ticket: Ticket) => void;
    };
  };

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Todas as situações' },
    ...TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status] })),
  ];

  const PRIORITY_FILTER_OPTIONS = [
    { value: '', label: 'Todas as urgências' },
    ...TICKET_PRIORITIES.map((priority) => ({
      value: priority,
      label: TICKET_PRIORITY_LABELS[priority],
    })),
  ];

  const DEPARTMENT_FILTER_OPTIONS = [
    { value: '', label: 'Todos os departamentos' },
    ...TICKET_DEPARTMENTS.map((department) => ({
      value: department,
      label: TICKET_DEPARTMENT_LABELS[department],
    })),
  ];

  const PROBLEM_TYPE_FILTER_OPTIONS = [
    { value: '', label: 'Todos os tipos' },
    ...TICKET_PROBLEM_TYPES.map((type) => ({
      value: type,
      label: TICKET_PROBLEM_TYPE_LABELS[type],
    })),
  ];

  /**
   * O tempo médio em palavras.
   *
   * Nulo NÃO vira "0 h": zero anunciaria atendimento instantâneo num sistema que ainda não
   * resolveu nada. Abaixo de uma hora sai em minutos, porque "0,3 h" ninguém lê.
   */
  export function formatAverage(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;

    return `${hours.toFixed(1).replace('.', ',')} h`;
  }
</script>

<script lang="ts">
  import Inbox from '@lucide/svelte/icons/inbox';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ColumnChart from '$lib/components/column-chart/column-chart.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: TicketListViewProps = $props();

  const dashboard = $derived(data.dashboard);

  const problemSlices = $derived(
    (dashboard?.byProblemType ?? []).map((row) => ({
      label: ticketProblemTypeLabel(row.key as TicketProblemType),
      value: row.count,
    })),
  );

  const departmentSlices = $derived(
    (dashboard?.byDepartment ?? []).map((row) => ({
      label: ticketDepartmentLabel(row.key as TicketDepartment),
      value: row.count,
    })),
  );

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR');
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{ title: 'Chamados', description: 'O que o pessoal pediu, e em que pé está.' }}
  />

  <StatCardGrid>
    <StatCard
      data={{ label: 'Abertos', value: dashboard?.open ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: state.isDashboardLoading }}
    />
    <StatCard
      data={{ label: 'Em atendimento', value: dashboard?.inProgress ?? 0 }}
      ui={{ tone: 'info' }}
      state={{ isLoading: state.isDashboardLoading }}
    />
    <StatCard
      data={{ label: 'Resolvidos', value: dashboard?.resolved ?? 0 }}
      ui={{ tone: 'success' }}
      state={{ isLoading: state.isDashboardLoading }}
    />
    <StatCard
      data={{
        label: 'Tempo médio de resolução',
        value: formatAverage(dashboard?.averageResolutionHours),
        hint: dashboard?.resolved ? `sobre ${dashboard.resolved} resolvido(s)` : 'nada resolvido ainda',
      }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: state.isDashboardLoading }}
    />
  </StatCardGrid>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="bg-card rounded-xl border p-4">
      <h2 class="text-ink-900 mb-2 text-sm font-semibold">Problemas por tipo</h2>
      <ColumnChart
        data={{ slices: problemSlices, seriesLabel: 'Chamados' }}
        state={{ isLoading: state.isDashboardLoading }}
        ui={{ emptyLabel: 'Ainda não há chamados para comparar.' }}
      />
    </section>
    <section class="bg-card rounded-xl border p-4">
      <h2 class="text-ink-900 mb-2 text-sm font-semibold">Departamentos com mais chamados</h2>
      <ColumnChart
        data={{ slices: departmentSlices, seriesLabel: 'Chamados' }}
        state={{ isLoading: state.isDashboardLoading }}
        ui={{ emptyLabel: 'Ainda não há chamados para comparar.' }}
      />
    </section>
  </div>

  <!-- Os filtros ficam juntos e acima da lista, para a pessoa ver de uma vez o que está
       limitando o que ela enxerga. -->
  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome de quem abriu, descrição, responsável ou solução',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por situação' }}
        actions={{ onChange: (value: string) => actions.onStatusChange(value as TicketStatus | '') }}
      />
      <SelectField
        data={{ value: data.filter.priority, options: PRIORITY_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por urgência' }}
        actions={{
          onChange: (value: string) => actions.onPriorityChange(value as TicketPriority | ''),
        }}
      />
      <SelectField
        data={{ value: data.filter.department, options: DEPARTMENT_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por departamento' }}
        actions={{
          onChange: (value: string) => actions.onDepartmentChange(value as TicketDepartment | ''),
        }}
      />
      <SelectField
        data={{ value: data.filter.problemType, options: PROBLEM_TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo de problema' }}
        actions={{
          onChange: (value: string) => actions.onProblemTypeChange(value as TicketProblemType | ''),
        }}
      />
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Não consegui carregar os chamados', message: state.error }}
      state={{ isRetrying: state.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os chamados…</p>
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum chamado ainda',
        description: 'Quando alguém abrir um chamado na página pública, ele aparece aqui.',
      }}
      ui={{ icon: Inbox }}
    />
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum chamado com esses filtros',
        description: 'Tente limpar os filtros para ver a fila inteira.',
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
            <th scope="col" class="py-2 pr-3">Protocolo</th>
            <th scope="col" class="py-2 pr-3">Quem abriu</th>
            <th scope="col" class="py-2 pr-3">Tipo</th>
            <th scope="col" class="py-2 pr-3">Urgência</th>
            <th scope="col" class="py-2 pr-3">Situação</th>
            <th scope="col" class="py-2 pr-3">Aberto em</th>
            <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.tickets as ticket (ticket.id)}
            <tr class="hover:bg-muted/40 border-b last:border-0">
              <td class="text-ink-900 py-2 pr-3 font-semibold">{ticket.protocol}</td>
              <td class="py-2 pr-3">
                <span class="text-ink-900">{ticket.requesterName}</span>
                <span class="text-ink-500 block text-xs">
                  {ticketDepartmentLabel(ticket.department)}
                </span>
              </td>
              <td class="text-ink-700 py-2 pr-3">{ticketProblemTypeLabel(ticket.problemType)}</td>
              <td class="py-2 pr-3">
                <StatusBadge
                  data={{ label: ticketPriorityLabel(ticket.priority) }}
                  ui={{ tone: ticketPriorityTone(ticket.priority), size: 'sm' }}
                />
              </td>
              <td class="py-2 pr-3">
                <StatusBadge
                  data={{ label: ticketStatusLabel(ticket.status) }}
                  ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
                />
              </td>
              <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                {formatDate(ticket.createdAt)}
              </td>
              <td class="py-2 text-right">
                <ActionButton
                  data={{ label: 'Atender' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onAnswer(ticket) }}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho da fila. -->
    {#if state.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.tickets.length} de {data.total} chamados. Use os filtros para chegar ao
        que procura.
      </p>
    {/if}
  {/if}
</div>
