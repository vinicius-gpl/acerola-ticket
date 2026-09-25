<script lang="ts">
  import NetworkListView from '$lib/components/network-list-view/network-list-view.svelte';
  import { useNetworkListModel } from '$lib/hooks/use-network-list/use-network-list.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Não há estado de tela aqui — o período e os filtros moram no view-model, junto das
   * consultas que eles refazem.
   */
  const network = useNetworkListModel();
</script>

<svelte:head>
  <title>Rede</title>
</svelte:head>

<NetworkListView data={network.data} state={network.state} actions={network.actions} />
