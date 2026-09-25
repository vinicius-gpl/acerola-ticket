<script lang="ts">
  import DashboardView from '$lib/components/dashboard-view/dashboard-view.svelte';
  import { useDashboardModel } from '$lib/hooks/use-dashboard/use-dashboard.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Não há estado nenhum aqui — o painel só lê, e o período que a pessoa escolhe mora no
   * view-model, junto da consulta que ele refaz.
   */
  const dashboard = useDashboardModel();
</script>

<svelte:head>
  <title>Painel</title>
</svelte:head>

<DashboardView data={dashboard.data} state={dashboard.state} actions={dashboard.actions} />
