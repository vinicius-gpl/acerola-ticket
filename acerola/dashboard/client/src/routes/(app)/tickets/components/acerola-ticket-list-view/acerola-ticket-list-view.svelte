<script lang="ts" module>
  import {
    TICKET_DEPARTMENTS,
    TICKET_DEPARTMENT_LABELS,
    TICKET_PROBLEM_TYPE_LABELS,
    TICKET_PROBLEM_TYPES,
    ticketAreaLabel,
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
  export type AcerolaTicketListViewProps = {
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
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Inbox from '@lucide/svelte/icons/inbox';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ColumnChart from '$lib/components/acerola-column-chart/acerola-column-chart.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PaginationBar from '$lib/components/acerola-pagination-bar/acerola-pagination-bar.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';
  import RadarChart from '$lib/components/acerola-radar-chart/acerola-radar-chart.svelte';
  import ReportExportActions from '$lib/components/acerola-report-export-actions/acerola-report-export-actions.svelte';
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

  let { data, state, actions }: AcerolaTicketListViewProps = $props();

  const tableView = useTableViewModel();

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

  const hasActiveFilter = $derived(
    Boolean(
      data.filter.search ||
        data.filter.status ||
        data.filter.priority ||
        data.filter.department ||
        data.filter.problemType,
    ),
  );

  /* A fila fica abaixo dos gráficos: quem clica num cartão lá em cima precisa VER o resultado.
     Só rolagem — é estado visual, não navegação.

     Variável comum, e não `$state`: este componente recebe uma prop chamada `state`, e com ela
     o compilador lê `$state(...)` como inscrição numa store. A referência só é usada dentro do
     clique, então não precisa ser reativa. */
  let queueElement: HTMLElement | null = null;

  function filterByStatus(status: TicketStatus) {
    actions.onStatusChange(data.filter.status === status ? '' : status);

    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    queueElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
</script>

<!-- max-w-7xl, e não 6xl como as outras listas: com 9 colunas (a área entrou com o #13), a
     tabela de chamados é a mais larga do painel, e no 6xl ela não cabia — nascia com rolagem
     para o lado mesmo em tela cheia. -->
<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader data={{ title: 'Chamados', description: 'O que o pessoal pediu, e em que pé está.' }}>
    <ReportExportActions
      state={{ exportingFormat: state.exportingFormat ?? null }}
      actions={{ onExport: actions.onExportReport }}
    />
  </PageHeader>

  {#if state.exportError}
    <ErrorState data={{ message: state.exportError }} ui={{ variant: 'inline' }} />
  {/if}

  <!-- Os três primeiros cartões são ATALHOS do filtro de situação: clicar em "Abertos" é o
       mesmo que escolher "Aberto" nas pastilhas lá embaixo, e clicar de novo tira o filtro.
       "Tempo médio" não é clicável — não existe um filtro que ele represente. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Abertos', value: dashboard?.open ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: state.isDashboardLoading, isSelected: data.filter.status === 'open' }}
      actions={{ onClick: () => filterByStatus('open') }}
    />
    <StatCard
      data={{ label: 'Em atendimento', value: dashboard?.inProgress ?? 0 }}
      ui={{ tone: 'info' }}
      state={{
        isLoading: state.isDashboardLoading,
        isSelected: data.filter.status === 'in_progress',
      }}
      actions={{ onClick: () => filterByStatus('in_progress') }}
    />
    <StatCard
      data={{ label: 'Resolvidos', value: dashboard?.resolved ?? 0 }}
      ui={{ tone: 'success' }}
      state={{
        isLoading: state.isDashboardLoading,
        isSelected: data.filter.status === 'resolved',
      }}
      actions={{ onClick: () => filterByStatus('resolved') }}
    />
    <StatCard
      data={{
        label: 'Tempo médio de resolução',
        value: formatAverage(dashboard?.averageResolutionHours),
        hint: dashboard?.resolved
          ? `sobre ${dashboard.resolved} resolvido(s)`
          : 'nada resolvido ainda',
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
      data={{
        title: 'Departamentos com mais chamados',
        hint: 'Do que mais pediu para o que menos',
      }}
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

  <!-- Busca, filtros e a fila dividem o MESMO cartão — no protótipo que validou este layout,
       filtro e tabela em fundos separados pareciam duas telas coladas. A fileira de filtros
       agora é UMA SÓ, que quebra sozinha (`flex-wrap`): no celular e no tablet cada pastilha
       ou balão cai pra próxima linha por conta própria, sem precisar de rolagem nem de uma
       segunda fileira fixa. -->
  <!-- `scroll-mt-4`: quando um cartão de indicador rola a tela até aqui, sobra um respiro acima. -->
  <div
    bind:this={queueElement}
    class="flex scroll-mt-4 flex-col rounded-surface border border-border bg-card shadow-xs"
  >
    <div class="flex flex-col gap-3 p-4">
      <TextField
        data={{
          label: 'Buscar',
          name: 'search',
          value: data.filter.search,
          placeholder: 'Nome de quem abriu, descrição, responsável ou solução',
        }}
        actions={{ onChange: actions.onSearchChange }}
      />

      <!-- DUAS FILEIRAS, cada filtro com o nome em cima. A de cima tem as escolhas diretas
           (pastilhas); a de baixo, as listas que abrem, e à direita o que age sobre a fila:
           limpar os filtros e trocar entre tabela e cards. Cada fileira ainda quebra sozinha
           no celular (`flex-wrap`). -->
      <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
        <FilterField data={{ label: 'Situação' }}>
          <OptionPicker
            data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
            actions={{
              onChange: (value: string) => actions.onStatusChange(value as TicketStatus | ''),
            }}
          />
        </FilterField>

        <FilterField data={{ label: 'Urgência' }}>
          <OptionPicker
            data={{ value: data.filter.priority, options: PRIORITY_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por urgência', allLabel: 'Qualquer urgência' }}
            actions={{
              onChange: (value: string) => actions.onPriorityChange(value as TicketPriority | ''),
            }}
          />
        </FilterField>
      </div>

      <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
        <FilterField data={{ label: 'Departamento' }}>
          <OptionPicker
            data={{ value: data.filter.department, options: DEPARTMENT_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por departamento', allLabel: 'Todos os departamentos' }}
            actions={{
              onChange: (value: string) =>
                actions.onDepartmentChange(value as TicketDepartment | ''),
            }}
          />
        </FilterField>

        <FilterField data={{ label: 'Tipo de problema' }}>
          <OptionPicker
            data={{ value: data.filter.problemType, options: PROBLEM_TYPE_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por tipo de problema', allLabel: 'Todos os tipos' }}
            actions={{
              onChange: (value: string) =>
                actions.onProblemTypeChange(value as TicketProblemType | ''),
            }}
          />
        </FilterField>

        <div class="ml-auto flex items-center gap-2">
          <!-- Só aparece quando há o que limpar: botão que nunca faz nada é ruído. Divide a
               fileira com campos, então tem a altura deles (`lg`). Quando o filtro escondeu
               tudo, quem oferece a limpeza é o aviso de lista vazia, logo abaixo — dois botões
               iguais na mesma tela só confundem. -->
          {#if hasActiveFilter && !state.isFilteredOut}
            <ActionButton
              data={{ label: 'Limpar filtros' }}
              ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
              actions={{ onClick: actions.onClearFilters }}
            />
          {/if}
          <!-- Ver em cards/tabela mora NESTE contexto — é sobre o que vem logo abaixo, não
               sobre a tela inteira (por isso saiu do cabeçalho da página). -->
          <TableViewToggle />
        </div>
      </div>
    </div>

    <div class="border-t border-border">
      <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
      {#if state.error}
        <div class="p-4">
          <ErrorState
            data={{ title: 'Não consegui carregar os chamados', message: state.error }}
            state={{ isRetrying: state.isRefetching }}
            actions={{ onRetry: actions.onRetry }}
          />
        </div>
      {:else if state.isLoading}
        <p class="text-ink-500 py-10 text-center text-sm">Carregando os chamados…</p>
      {:else if state.isEmpty}
        <div class="p-4">
          <EmptyState
            data={{
              title: 'Nenhum chamado ainda',
              description: 'Quando alguém abrir um chamado na página pública, ele aparece aqui.',
            }}
            ui={{ icon: Inbox }}
          />
        </div>
      {:else if state.isFilteredOut}
        <div class="p-4">
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
        </div>
      {:else}
        <!-- 1. Visualização em Cards: sempre que a tela é estreita (< xl), ou quando a pessoa
         pediu para ver sempre assim (`TableViewToggle`, no cabeçalho dos filtros). -->
        <div
          class={cn('card-grid p-4', !tableView.forceCards && 'xl:hidden')}
          data-slot="ticket-cards-mobile"
        >
          {#each data.tickets as ticket (ticket.id)}
            <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
            <div
              use:fillFromPointer
              style:--fill-color={fillColorOf(ticketStatusTone(ticket.status))}
              class="hover-fill flex flex-col gap-3 rounded-surface border border-border bg-card p-4 shadow-xs"
            >
              <div class="flex items-center justify-between gap-2">
                <span
                  class="font-mono text-xs font-semibold text-ink-900"
                >
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
                <span class="font-semibold text-ink-900 text-sm">
                  {ticket.requesterName}
                </span>
                <span class="text-xs text-ink-500">
                  {ticketDepartmentLabel(ticket.department)}
                </span>
              </div>

              <div class="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                <div class="flex flex-col gap-0.5">
                  <span
                    class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >Área</span
                  >
                  <span class="text-ink-700"
                    >{ticketAreaLabel(ticket.area)}</span
                  >
                </div>
                <div class="flex flex-col gap-0.5">
                  <span
                    class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >Tipo</span
                  >
                  <span class="text-ink-700"
                    >{ticketProblemTypeLabel(ticket.problemType)}</span
                  >
                </div>
                <div class="flex flex-col gap-0.5">
                  <span
                    class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >Máquina</span
                  >
                  <span class="text-ink-700"
                    >{ticket.computerName ?? '—'}</span
                  >
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-border/60">
                <span class="text-xs text-ink-500">
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

        <!-- 2. Visualização em Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu
         sempre cards. -->
        <div
          class={cn('hidden', !tableView.forceCards && 'xl:block')}
          data-slot="ticket-table-desktop"
        >
          <Table
            class="min-w-[980px]"
            containerClass="rounded-none border-0 bg-transparent shadow-none"
          >
            <TableHeader>
              <TableRow>
                <TableHead class="min-w-[110px]">Protocolo</TableHead>
                <TableHead class="min-w-[180px]">Quem abriu</TableHead>
                <TableHead class="min-w-[110px]">Área</TableHead>
                <TableHead class="min-w-[140px]">Tipo</TableHead>
                <TableHead class="min-w-[160px]">Máquina</TableHead>
                <TableHead class="min-w-[110px]">Urgência</TableHead>
                <TableHead class="min-w-[120px]">Situação</TableHead>
                <TableHead class="min-w-[110px]">Aberto em</TableHead>
                <TableHead class="min-w-[90px] text-right"
                  ><span class="sr-only">Ações</span></TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each data.tickets as ticket (ticket.id)}
                <TableRow>
                  <TableCell
                    class="font-mono text-xs font-semibold text-ink-900"
                    >{ticket.protocol}</TableCell
                  >
                  <TableCell>
                    <span class="font-medium text-ink-900"
                      >{ticket.requesterName}</span
                    >
                    <span class="block text-xs text-ink-500">
                      {ticketDepartmentLabel(ticket.department)}
                    </span>
                  </TableCell>
                  <TableCell class="text-ink-700"
                    >{ticketAreaLabel(ticket.area)}</TableCell
                  >
                  <TableCell class="text-ink-700"
                    >{ticketProblemTypeLabel(ticket.problemType)}</TableCell
                  >
                  <!-- A maioria dos chamados não tem máquina: quem atende é que vincula. O traço diz
                   "ainda não vinculado" sem virar um vazio que parece defeito de tela. -->
                  <TableCell class="text-ink-700">
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
                  <TableCell class="text-xs text-ink-500 whitespace-nowrap">
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
      {/if}
    </div>
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
      Mostrando {data.tickets.length} de {data.total} chamados. Use os filtros para chegar ao que procura.
    </p>
  {/if}
</div>
