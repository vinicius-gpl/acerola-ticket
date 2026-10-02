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
      onPageChange?: (page: number) => void;
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
  import PaginationBar from '$lib/components/pagination-bar/pagination-bar.svelte';
  import PanelCard from '$lib/components/panel-card/panel-card.svelte';
  import RadarChart from '$lib/components/radar-chart/radar-chart.svelte';
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

  <!-- DOIS FORMATOS, porque são duas perguntas diferentes.
       "Em que este escritório dá problema" é um PERFIL — todos os tipos de uma vez, e a
       forma da teia se reconhece de longe. "Qual departamento abriu mais" é uma ORDEM, e
       ordem se lê em barra, na hora. A rosca não entra em nenhuma das duas: com nove tipos
       ela vira um anel de fatias finas que só se lê pela legenda ao lado — e quem está lendo
       a legenda não está olhando o desenho. -->
  <div class="grid gap-4 lg:grid-cols-2">
    <PanelCard
      data={{ title: 'Problemas por tipo', hint: 'O perfil do que dá trabalho neste escritório' }}
    >
      <RadarChart
        data={{ slices: problemSlices, seriesLabel: 'Chamados' }}
        state={{ isLoading: state.isDashboardLoading }}
        ui={{ emptyLabel: 'Ainda não há chamados para comparar.' }}
      />
    </PanelCard>

    <PanelCard
      data={{ title: 'Departamentos com mais chamados', hint: 'Do que mais pediu para o que menos' }}
    >
      <div class="max-h-72 overflow-x-hidden overflow-y-auto">
        <ColumnChart
          data={{ slices: departmentSlices, seriesLabel: 'Chamados' }}
          state={{ isLoading: state.isDashboardLoading }}
          ui={{ orientation: 'horizontal', emptyLabel: 'Ainda não há chamados para comparar.' }}
        />
      </div>
    </PanelCard>
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
        <div class="flex flex-col gap-1.5 sm:block">
          <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
            Situação
          </span>
          <OptionPicker
            data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
            actions={{ onChange: (value: string) => actions.onStatusChange(value as TicketStatus | '') }}
          />
        </div>
        <Separator orientation="horizontal" class="bg-border sm:hidden" />
        <Separator orientation="vertical" class="bg-border mx-1 hidden h-9 w-px sm:block" />
        <div class="flex flex-col gap-1.5 sm:block">
          <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
            Urgência
          </span>
          <OptionPicker
            data={{ value: data.filter.priority, options: PRIORITY_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por urgência', allLabel: 'Qualquer urgência' }}
            actions={{
              onChange: (value: string) => actions.onPriorityChange(value as TicketPriority | ''),
            }}
          />
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="flex flex-col gap-1.5 sm:block w-full sm:w-auto">
          <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
            Departamento
          </span>
          <OptionPicker
            data={{ value: data.filter.department, options: DEPARTMENT_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por departamento', allLabel: 'Todos os departamentos' }}
            actions={{
              onChange: (value: string) => actions.onDepartmentChange(value as TicketDepartment | ''),
            }}
          />
        </div>
        <Separator orientation="horizontal" class="bg-border sm:hidden" />
        <Separator orientation="vertical" class="bg-border mx-1 hidden h-9 w-px sm:block" />
        <div class="flex flex-col gap-1.5 sm:block w-full sm:w-auto">
          <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
            Tipo de problema
          </span>
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
    <!-- 1. Visualização em Cards para Dispositivos Móveis (< xl) -->
    <div class="flex flex-col gap-3 xl:hidden" data-slot="ticket-cards-mobile">
      {#each data.tickets as ticket (ticket.id)}
        <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {ticket.protocol}
            </span>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <StatusBadge
                data={{ label: ticketPriorityLabel(ticket.priority) }}
                ui={{ tone: ticketPriorityTone(ticket.priority), size: 'sm' }}
              />
              <StatusBadge
                data={{ label: ticketStatusLabel(ticket.status) }}
                ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
              />
            </div>
          </div>

          <div class="flex flex-col gap-0.5">
            <span class="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              {ticket.requesterName}
            </span>
            <span class="text-xs text-neutral-400">
              {ticketDepartmentLabel(ticket.department)}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tipo</span>
              <span class="text-neutral-700 dark:text-neutral-200">{ticketProblemTypeLabel(ticket.problemType)}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Máquina</span>
              <span class="text-neutral-700 dark:text-neutral-200">{ticket.computerName ?? '—'}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-border/60">
            <span class="text-xs text-neutral-500">
              Aberto em {formatDate(ticket.createdAt)}
            </span>
            <ActionButton
              data={{ label: 'Atender' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onAnswer(ticket) }}
            />
          </div>
        </div>
      {/each}
    </div>

    <!-- 2. Visualização em Tabela para Desktop (>= xl) -->
    <div class="hidden xl:block" data-slot="ticket-table-desktop">
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
          <span>{data.tickets.length} chamado(s) nesta página</span>
        {/snippet}
      </Table>
    </div>

    <!-- Paginação da fila de chamados -->
    {#if (data.paging ? data.paging.total : data.total) > 0}
      <PaginationBar
        data={{
          page: data.paging?.page ?? 1,
          pageSize: data.paging?.pageSize ?? data.tickets.length,
          total: data.paging?.total ?? data.total,
          noun: ['chamado', 'chamados'],
        }}
        state={{ isLoading: state.isLoading || state.isRefetching }}
        actions={{ onPageChange: (newPage) => actions.onPageChange?.(newPage) }}
      />
    {/if}

    <!-- Truncar calado é mentir sobre o tamanho da fila. -->
    {#if state.isTruncated && !data.paging}
      <p class="text-ink-500 text-xs">
        Mostrando {data.tickets.length} de {data.total} chamados. Use os filtros para chegar ao
        que procura.
      </p>
    {/if}
  {/if}
</div>
