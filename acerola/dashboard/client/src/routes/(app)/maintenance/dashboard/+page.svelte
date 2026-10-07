<script lang="ts">
  import MaintenanceDashboardView from './components/acerola-maintenance-dashboard-view/acerola-maintenance-dashboard-view.svelte';
  import { useMaintenanceDashboardModel } from '$lib/hooks/use-maintenance-dashboard/use-maintenance-dashboard.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * É o painel DA MANUTENÇÃO, uma tela própria do contexto — o de Infraestrutura
   * (`/infra/dashboard`) resume máquinas, e aqui não há máquina para resumir.
   */
  const dashboard = useMaintenanceDashboardModel();
</script>

<svelte:head>
  <title>Painel da Manutenção</title>
</svelte:head>

<MaintenanceDashboardView
  data={dashboard.data}
  state={dashboard.state}
  actions={dashboard.actions}
/>
