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
  import { type ReportFormat } from '@template/shared/schemas/report.schema';
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
      exportingFormat?: ReportFormat | null;
      exportError?: string | null;
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
      onExportReport: (format: ReportFormat) => void;
    };
  };

  const STATUS_FILTER_OPTIONS = TICKET_STATUSES.map((status) => ({
    value: status,
    label: TICKET_STATUS_LABELS[status],
    tone: ticketStatusTone(status),
  }));

  const PRIORITY_FILTER_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
    tone: ticketPriorityTone(priority),
  }));

  const DEPARTMENT_FILTER_OPTIONS = TICKET_DEPARTMENTS.map((department) => ({
    value: department,
    label: TICKET_DEPARTMENT_LABELS[department],
  }));

  const PROBLEM_TYPE_FILTER_OPTIONS = TICKET_PROBLEM_TYPES.map((type) => ({
    value: type,
    label: TICKET_PROBLEM_TYPE_LABELS[type],
  }));

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
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import ReportExportActions from '$lib/components/report-export-actions/report-export-actions.svelte';
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
  >
    <ReportExportActions
      state={{ exportingFormat: state.exportingFormat ?? null }}
      actions={{ onExport: actions.onExportReport }}
    />
  </PageHeader>

  {#if state.exportError}
    <ErrorState data={{ message: state.exportError }} ui={{ variant: 'inline' }} />
  {/if}

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
    <section class="bg-card rounded-2xl border border-border p-5 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Problemas por tipo</h2>
        <span class="text-[11px] text-neutral-400">Distribuição</span>
      </div>
      <!-- Altura fixa: o gráfico preenche o espaço que recebe, e sem uma caixa de altura de
           verdade ele nasce com altura zero e os rótulos vazam por cima do que vem depois. -->
      <div class="h-64">
        <ColumnChart
          data={{ slices: problemSlices, seriesLabel: 'Chamados' }}
          state={{ isLoading: state.isDashboardLoading }}
          ui={{ emptyLabel: 'Ainda não há chamados para comparar.' }}
        />
      </div>
    </section>
    <section class="bg-card rounded-2xl border border-border p-5 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Departamentos com mais chamados</h2>
        <span class="text-[11px] text-neutral-400">Volume</span>
      </div>
      <div class="h-64">
        <ColumnChart
          data={{ slices: departmentSlices, seriesLabel: 'Chamados' }}
          state={{ isLoading: state.isDashboardLoading }}
          ui={{ emptyLabel: 'Ainda não há chamados para comparar.' }}
        />
      </div>
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

    <!-- Duas fileiras fixas, e não uma só que quebra sozinha: situação/urgência (poucas
         opções, pastilha) numa linha, departamento/tipo (muitas opções, busca em balão) na
         de baixo — uma fileira só virava uma bagunça de tamanhos diferentes se reordenando
         a cada largura de tela. -->
    <div class="flex flex-col gap-3">
      <!-- Situação e urgência são perguntas DIFERENTES ("em que pé está" e "quão urgente é"),
           e lado a lado os dois grupos de botões viravam uma régua só. O traço separa os dois
           sem gastar uma linha inteira. No celular ele vira horizontal, porque ali os grupos
           empilham em vez de ficar lado a lado. -->
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <OptionPicker
          data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
          actions={{ onChange: (value: string) => actions.onStatusChange(value as TicketStatus | '') }}
        />
        <Separator orientation="horizontal" class="bg-border sm:hidden" />
        <Separator orientation="vertical" class="bg-border mx-1 hidden h-9 w-px sm:block" />
        <OptionPicker
          data={{ value: data.filter.priority, options: PRIORITY_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por urgência', allLabel: 'Qualquer urgência' }}
          actions={{
            onChange: (value: string) => actions.onPriorityChange(value as TicketPriority | ''),
          }}
        />
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <OptionPicker
          data={{ value: data.filter.department, options: DEPARTMENT_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por departamento', allLabel: 'Todos os departamentos' }}
          actions={{
            onChange: (value: string) => actions.onDepartmentChange(value as TicketDepartment | ''),
          }}
        />
        <Separator orientation="horizontal" class="bg-border sm:hidden" />
        <Separator orientation="vertical" class="bg-border mx-1 hidden h-9 w-px sm:block" />
        <OptionPicker
          data={{ value: data.filter.problemType, options: PROBLEM_TYPE_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo de problema', allLabel: 'Todos os tipos' }}
          actions={{
            onChange: (value: string) => actions.onProblemTypeChange(value as TicketProblemType | ''),
          }}
        />
      </div>
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
    <Table class="min-w-[880px]">
      <TableHeader>
        <TableRow>
          <TableHead class="min-w-[110px]">Protocolo</TableHead>
          <TableHead class="min-w-[180px]">Quem abriu</TableHead>
          <TableHead class="min-w-[140px]">Tipo</TableHead>
          <TableHead class="min-w-[160px]">Máquina</TableHead>
          <TableHead class="min-w-[110px]">Urgência</TableHead>
          <TableHead class="min-w-[120px]">Situação</TableHead>
          <TableHead class="min-w-[110px]">Aberto em</TableHead>
          <TableHead class="min-w-[90px] text-right"><span class="sr-only">Ações</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each data.tickets as ticket (ticket.id)}
          <TableRow>
            <TableCell class="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">{ticket.protocol}</TableCell>
            <TableCell>
              <span class="font-medium text-neutral-900 dark:text-neutral-100">{ticket.requesterName}</span>
              <span class="block text-xs text-neutral-400">
                {ticketDepartmentLabel(ticket.department)}
              </span>
            </TableCell>
            <TableCell class="text-neutral-600 dark:text-neutral-300">{ticketProblemTypeLabel(ticket.problemType)}</TableCell>
            <!-- A maioria dos chamados não tem máquina: quem atende é que vincula. O traço diz
                 "ainda não vinculado" sem virar um vazio que parece defeito de tela. -->
            <TableCell class="text-neutral-600 dark:text-neutral-300">
              {ticket.computerName ?? '—'}
            </TableCell>
            <TableCell>
              <StatusBadge
                data={{ label: ticketPriorityLabel(ticket.priority) }}
                ui={{ tone: ticketPriorityTone(ticket.priority), size: 'sm' }}
              />
            </TableCell>
            <TableCell>
              <StatusBadge
                data={{ label: ticketStatusLabel(ticket.status) }}
                ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
              />
            </TableCell>
            <TableCell class="text-xs text-neutral-500 whitespace-nowrap">
              {formatDate(ticket.createdAt)}
            </TableCell>
            <TableCell class="text-right whitespace-nowrap">
              <TableActions>
                <ActionButton
                  data={{ label: 'Atender' }}
                  ui={{ variant: 'secondary', size: 'sm' }}
                  actions={{ onClick: () => actions.onAnswer(ticket) }}
                />
              </TableActions>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
      {#snippet footer()}
        <span>Fila de chamados sincronizada em tempo real</span>
        <span>{data.tickets.length} chamado(s) listado(s)</span>
      {/snippet}
    </Table>

    <!-- Truncar calado é mentir sobre o tamanho da fila. -->
    {#if state.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.tickets.length} de {data.total} chamados. Use os filtros para chegar ao
        que procura.
      </p>
    {/if}
  {/if}
</div>
