<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type TicketDashboard } from '$lib/api/tickets.api';
  import TicketListView, { type TicketListFilter } from './ticket-list-view.svelte';

  function ticket(over: Partial<Ticket> = {}): Ticket {
    return {
      id: 1,
      protocol: 'CH-0001',
      status: 'open',
      priority: 'high',
      requesterName: 'Bia Costa',
      department: 'financeiro',
      problemType: 'printer',
      anydeskId: null,
      contactPhone: '62999990001',
      notifyWhatsapp: true,
      description: 'A impressora da sala não puxa papel.',
      screenshotUrl: null,
      assignee: null,
      solution: null,
      createdAt: '2026-09-15T12:10:00.000Z',
      startedAt: null,
      resolvedAt: null,
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const tickets: Ticket[] = [
    ticket(),
    ticket({
      id: 2,
      protocol: 'CH-0002',
      status: 'in_progress',
      priority: 'medium',
      requesterName: 'Carlos Menezes',
      department: 'rh',
      problemType: 'network',
      assignee: 'Suporte TI',
    }),
    ticket({
      id: 3,
      protocol: 'CH-0003',
      status: 'resolved',
      priority: 'low',
      requesterName: 'Daniela Prado',
      department: 'comercial',
      problemType: 'slow_computer',
      solution: 'Troquei o disco por um SSD.',
    }),
    ticket({
      id: 4,
      protocol: 'CH-0004',
      status: 'cancelled',
      priority: 'low',
      requesterName: 'Eduardo Lima',
      department: 'cs',
      problemType: 'other',
    }),
  ];

  const dashboard: TicketDashboard = {
    total: 12,
    open: 5,
    inProgress: 2,
    resolved: 4,
    cancelled: 1,
    averageResolutionHours: 1.8,
    byProblemType: [
      { key: 'printer', count: 4 },
      { key: 'network', count: 3 },
      { key: 'slow_computer', count: 2 },
    ],
    byDepartment: [
      { key: 'financeiro', count: 4 },
      { key: 'rh', count: 3 },
      { key: 'comercial', count: 2 },
    ],
  };

  const emptyFilter: TicketListFilter = {
    search: '',
    status: '',
    priority: '',
    department: '',
    problemType: '',
  };

  const actions = {
    onSearchChange: () => {},
    onStatusChange: () => {},
    onPriorityChange: () => {},
    onDepartmentChange: () => {},
    onProblemTypeChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onAnswer: () => {},
  };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const { Story } = defineMeta({
    title: 'Components/TicketListView',
    component: TicketListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { tickets, total: tickets.length, dashboard, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { tickets: [], total: 0, dashboard: null, filter: emptyFilter },
    state: { ...settled, isLoading: true, isDashboardLoading: true },
    actions,
  }}
/>

<!-- Nenhum chamado ainda: nada de errado, só ninguém pediu nada. -->
<Story
  name="Empty"
  args={{
    data: {
      tickets: [],
      total: 0,
      dashboard: { ...dashboard, total: 0, open: 0, inProgress: 0, resolved: 0, cancelled: 0, averageResolutionHours: null, byProblemType: [], byDepartment: [] },
      filter: emptyFilter,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Existem chamados, mas o filtro escondeu todos: o próximo passo é limpar o filtro. -->
<Story
  name="FilteredOut"
  args={{
    data: {
      tickets: [],
      total: 0,
      dashboard,
      filter: { ...emptyFilter, status: 'resolved', department: 'rh' },
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { tickets: [], total: 0, dashboard: null, filter: emptyFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Truncar calado é mentir sobre o tamanho da fila. -->
<Story
  name="Truncated"
  args={{
    data: { tickets, total: 240, dashboard, filter: emptyFilter },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>

<!-- Caso limite: nada resolvido ainda, então o tempo médio não existe — e não é zero. -->
<Story
  name="NothingResolvedYet"
  args={{
    data: {
      tickets: [ticket()],
      total: 1,
      dashboard: { ...dashboard, total: 1, open: 1, inProgress: 0, resolved: 0, cancelled: 0, averageResolutionHours: null },
      filter: emptyFilter,
    },
    state: settled,
    actions,
  }}
/>
