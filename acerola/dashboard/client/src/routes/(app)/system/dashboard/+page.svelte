<script lang="ts">
  import SystemDashboardView from './components/acerola-system-dashboard-view/acerola-system-dashboard-view.svelte';
  import { useSoftwareDashboardModel } from '$lib/hooks/use-software-dashboard/use-software-dashboard.svelte';

  const dashboard = useSoftwareDashboardModel();
</script>

<svelte:head>
  <title>Painel de Sistemas</title>
</svelte:head>

<SystemDashboardView
  data={dashboard.data}
  state={dashboard.state}
  actions={dashboard.actions}
/>
