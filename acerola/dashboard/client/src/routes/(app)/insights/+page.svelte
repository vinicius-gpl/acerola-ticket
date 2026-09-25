<script lang="ts">
  import InsightsView from '$lib/components/insights-view/insights-view.svelte';
  import { useInsightsModel } from '$lib/hooks/use-insights/use-insights.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Não há estado de tela aqui — o período mora no view-model, junto da consulta que ele
   * refaz.
   */
  const insights = useInsightsModel();
</script>

<svelte:head>
  <title>Inteligência</title>
</svelte:head>

<InsightsView data={insights.data} state={insights.state} actions={insights.actions} />
