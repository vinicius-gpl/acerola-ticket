<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
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

  const mockColumns = [
    {
      id: 'todo' as const,
      title: 'Abertos',
      tickets: [
        {
          id: 10,
          protocol: 'CH-0010',
          title: 'Erro na autenticação do sistema',
          description: 'Erro na autenticação do sistema',
          priority: 'high' as const,
          projectName: 'Acerola Ticket',
          requesterName: 'Ana Souza',
          githubIssueNumber: 42,
          githubIssueUrl: 'https://github.com/issue/42',
          createdAt: '2026-10-06T12:00:00.000Z',
        } as any,
      ],
    },
    {
      id: 'in_progress' as const,
      title: 'Em Atendimento',
      tickets: [
        {
          id: 11,
          protocol: 'CH-0011',
          title: 'Refatoração da sincronização de PRs',
          description: 'Refatoração da sincronização de PRs',
          priority: 'medium' as const,
          projectName: 'Acerola Ticket',
          requesterName: 'Carlos Dev',
          githubIssueNumber: null,
          githubIssueUrl: null,
          createdAt: '2026-10-05T15:00:00.000Z',
        } as any,
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
