<script lang="ts">
  import InventoryDisposalListView from './components/acerola-inventory-disposal-list-view/acerola-inventory-disposal-list-view.svelte';
  import { useInventoryDisposalListModel } from '$lib/hooks/use-inventory-disposal-list/use-inventory-disposal-list.svelte';
  import DisposalFormSlot from './disposal-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é SE O FORMULÁRIO ESTÁ NA FRENTE.
   */
  const list = useInventoryDisposalListModel();

  let isRegistering = $state(false);
</script>

<svelte:head>
  <title>Descarte</title>
</svelte:head>

<InventoryDisposalListView
  data={list.data}
  state={list.state}
  actions={{ ...list.actions, onRegister: () => (isRegistering = true) }}
/>

{#if isRegistering}
  <DisposalFormSlot onClose={() => (isRegistering = false)} />
{/if}
