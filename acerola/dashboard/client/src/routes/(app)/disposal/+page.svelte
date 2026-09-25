<script lang="ts">
  import DisposalListView from '$lib/components/disposal-list-view/disposal-list-view.svelte';
  import { useDisposalListModel } from '$lib/hooks/use-disposal-list/use-disposal-list.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Não há estado de tela aqui — descartar acontece na ficha da máquina, e a única escrita
   * desta tela (devolver ao inventário) mora no próprio view-model.
   */
  const disposal = useDisposalListModel();
</script>

<svelte:head>
  <title>Descarte</title>
</svelte:head>

<DisposalListView data={disposal.data} state={disposal.state} actions={disposal.actions} />
