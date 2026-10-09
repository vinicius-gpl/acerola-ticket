<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';
  import { fn } from 'storybook/test';

  import SystemDashboardView from './acerola-system-dashboard-view.svelte';

  const mockSummary: SoftwareDashboard = {
    monthName: 'Outubro',
    monthYear: 'Outubro de 2026',
    projectsSummary: {
      total: 4,
      active: 2,
      maintenance: 1,
      deprecated: 1,
    },
    ticketsMonthSummary: {
      opened: 12,
      resolved: 9,
      pending: 3,
      resolutionRate: 75.0,
      averageResolutionHours: 4.5,
    },
    ticketsByProblemType: [
      { key: 'bug', label: 'Defeito / Bug', count: 6 },
      { key: 'feature_request', label: 'Nova Funcionalidade', count: 4 },
      { key: 'access_request', label: 'Permissão / Acesso', count: 2 },
    ],
    prsMonthSummary: {
      opened: 2,
      merged: 8,
      total: 10,
    },
    weeklyTrend: [
      { weekLabel: 'Semana 1', openedTickets: 3, resolvedTickets: 2, pullRequests: 3 },
      { weekLabel: 'Semana 2', openedTickets: 4, resolvedTickets: 3, pullRequests: 4 },
      { weekLabel: 'Semana 3', openedTickets: 3, resolvedTickets: 2, pullRequests: 2 },
      { weekLabel: 'Semana 4', openedTickets: 2, resolvedTickets: 2, pullRequests: 1 },
    ],
    recentTimeline: [
      {
        id: 1,
        projectId: 1,
        projectName: 'Acerola Ticket',
        type: 'pr',
        externalId: '#104',
        title: 'feat: Integração com GitHub Issues e Timeline',
        description: null,
        url: 'https://github.com/pull/104',
        author: 'vinicius-gpl',
        status: 'merged',
        eventDate: '2026-10-06T12:00:00Z',
        createdAt: '2026-10-06T12:00:00Z',
      },
    ],
  };

  const baseData = {
    summary: mockSummary,
  };

  const baseState = {
    isLoading: false,
    error: null,
  };

  const baseActions = {
    onRetry: fn(),
    onOpenTickets: fn(),
    onOpenKanban: fn(),
    onOpenSchedule: fn(),
    onOpenProjects: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaSystemDashboardView',
    component: SystemDashboardView,
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
    data: { summary: null },
    state: { ...baseState, isLoading: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithError"
  args={{
    data: { summary: null },
    state: { ...baseState, error: 'Falha ao carregar indicadores mensais.' },
    actions: baseActions,
  }}
/>
