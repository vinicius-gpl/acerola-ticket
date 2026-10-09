<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { fn } from 'storybook/test';

  import SystemKanbanView from './acerola-system-kanban-view.svelte';

  const mockProjects: SoftwareProject[] = [
    {
      id: 1,
      name: 'Acerola Ticket',
      description: 'Sistema central',
      repositoryUrl: 'vinicius-gpl/acerola-ticket',
      githubRepoOwner: 'vinicius-gpl',
      githubRepoName: 'acerola-ticket',
      status: 'active',
      color: 'blue',
      openTicketsCount: 3,
      pullRequestsCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
    },
  ];

  function mockTicket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'protocol' | 'description'>): Ticket {
    return {
      status: 'open',
      priority: 'medium',
      requesterName: 'Ana Souza',
      area: 'sistema',
      department: 'financeiro',
      problemType: 'bug',
      participantAreas: [],
      anydeskId: null,
      contactPhone: null,
      notifyWhatsapp: false,
      screenshotUrl: null,
      computerId: null,
      computerName: null,
      projectId: 1,
      projectName: 'Acerola Ticket',
      githubIssueNumber: null,
      githubIssueUrl: null,
      assignee: null,
      solution: null,
      createdAt: '2026-10-06T12:00:00.000Z',
      startedAt: null,
      resolvedAt: null,
      updatedAt: null,
      updatedBy: null,
      ...partial,
    };
  }

  const mockColumns = [
    {
      id: 'todo' as const,
      title: 'Abertos',
      tickets: [
        mockTicket({
          id: 10,
          protocol: 'CH-0010',
          description: 'Erro na autenticação do sistema',
          priority: 'high',
          projectName: 'Acerola Ticket',
          requesterName: 'Ana Souza',
          githubIssueNumber: 42,
          githubIssueUrl: 'https://github.com/issue/42',
          createdAt: '2026-10-06T12:00:00.000Z',
        }),
      ],
    },
    {
      id: 'in_progress' as const,
      title: 'Em Atendimento',
      tickets: [
        mockTicket({
          id: 11,
          protocol: 'CH-0011',
          description: 'Refatoração da sincronização de PRs',
          priority: 'medium',
          projectName: 'Acerola Ticket',
          requesterName: 'Carlos Dev',
          githubIssueNumber: null,
          githubIssueUrl: null,
          createdAt: '2026-10-05T15:00:00.000Z',
        }),
      ],
    },
    { id: 'waiting' as const, title: 'Aguardando Terceiros', tickets: [] },
    { id: 'done' as const, title: 'Resolvidos', tickets: [] },
  ];

  const baseData = {
    columns: mockColumns,
    projects: mockProjects,
    selectedProjectId: null,
    totalTickets: 2,
    cardColors: {},
  };

  const baseState = {
    isLoading: false,
    isEmpty: false,
    error: null,
  };

  const baseActions = {
    onSelectProject: fn(),
    onRetry: fn(),
    onOpenTicket: fn(),
    onMoveTicket: fn(),
    onSetCardColor: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaSystemKanbanView',
    component: SystemKanbanView,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: baseData,
    state: baseState,
    actions: baseActions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { ...baseData, columns: [] },
    state: { ...baseState, isLoading: true },
    actions: baseActions,
  }}
/>

<Story
  name="Empty"
  args={{
    data: { ...baseData, columns: [], totalTickets: 0 },
    state: { ...baseState, isEmpty: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithError"
  args={{
    data: baseData,
    state: { ...baseState, error: 'Falha ao carregar chamados para o Kanban.' },
    actions: baseActions,
  }}
/>
