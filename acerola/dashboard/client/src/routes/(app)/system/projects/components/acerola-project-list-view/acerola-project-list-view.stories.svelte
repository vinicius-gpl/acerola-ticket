<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { fn } from 'storybook/test';

  import ProjectListView from './acerola-project-list-view.svelte';

  const mockProject: SoftwareProject = {
    id: 1,
    name: 'Acerola Ticket',
    description: 'Sistema central de chamados e governança de TI.',
    repositoryUrl: 'vinicius-gpl/acerola-ticket',
    githubRepoOwner: 'vinicius-gpl',
    githubRepoName: 'acerola-ticket',
    status: 'active',
    color: 'blue',
    openTicketsCount: 4,
    pullRequestsCount: 12,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: null,
  };

  const projects: SoftwareProject[] = [
    mockProject,
    {
      ...mockProject,
      id: 2,
      name: 'Portal do Cliente',
      description: 'Interface web para acompanhamento e autoatendimento.',
      repositoryUrl: 'vinicius-gpl/portal-cliente',
      githubRepoOwner: 'vinicius-gpl',
      githubRepoName: 'portal-cliente',
      status: 'active',
      color: 'green',
      openTicketsCount: 1,
      pullRequestsCount: 8,
    },
    {
      ...mockProject,
      id: 3,
      name: 'ERP Legado',
      description: 'Módulo financeiro legado em descontinuação.',
      repositoryUrl: 'vinicius-gpl/erp-legacy',
      githubRepoOwner: 'vinicius-gpl',
      githubRepoName: 'erp-legacy',
      status: 'deprecated',
      color: 'amber',
      openTicketsCount: 0,
      pullRequestsCount: 2,
    },
  ];

  const baseData = {
    items: projects,
    total: 3,
    filter: { search: '', status: '' as const },
    deleting: null,
  };

  const idleState = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isDeleting: false,
    isSyncing: false,
    error: null,
    deleteError: null,
    syncMessage: null,
  };

  const baseActions = {
    onSearchChange: fn(),
    onStatusChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
    onRegister: fn(),
    onEdit: fn(),
    onViewTimeline: fn(),
    onAskDelete: fn(),
    onCancelDelete: fn(),
    onConfirmDelete: fn(),
    onSyncGithub: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaProjectListView',
    component: ProjectListView,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: baseData,
    state: idleState,
    actions: baseActions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { ...baseData, items: [] },
    state: { ...idleState, isLoading: true },
    actions: baseActions,
  }}
/>

<Story
  name="Empty"
  args={{
    data: { ...baseData, items: [], total: 0 },
    state: { ...idleState, isEmpty: true },
    actions: baseActions,
  }}
/>

<Story
  name="FilteredOut"
  args={{
    data: { ...baseData, items: [], total: 0, filter: { search: 'xyz', status: '' } },
    state: { ...idleState, isFilteredOut: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithError"
  args={{
    data: { ...baseData, items: [], total: 0 },
    state: { ...idleState, error: 'Falha ao carregar sistemas do servidor.' },
    actions: baseActions,
  }}
/>
