<script lang="ts">
  import { goto } from '$app/navigation';
  import { type StockMovementType } from '@template/shared/domain/inventory-stock.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  import StockListView from './components/acerola-stock-list-view/acerola-stock-list-view.svelte';
  import { useInventoryStockModel } from '$lib/hooks/use-inventory-stock/use-inventory-stock.svelte';
  import InventoryMovementSlot from './inventory-movement-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o diálogo de entrada ou o
   * de saída, e de qual produto.
   */
  const stock = useInventoryStockModel();

  let moving = $state<{ type: StockMovementType; item: InventoryItem } | null>(null);
</script>

<svelte:head>
  <title>Depósito</title>
</svelte:head>

<StockListView
  data={stock.data}
  state={stock.state}
  actions={{
    ...stock.actions,
    onEntry: (item: InventoryItem) => (moving = { type: 'in', item }),
    onExit: (item: InventoryItem) => (moving = { type: 'out', item }),
    onOpenInventory: () => void goto('/maintenance/inventory'),
  }}
/>

<!-- `{#key}` pelo produto e pelo tipo: cada movimento monta um formulário NOVO, em branco. -->
{#if moving}
  {#key `${moving.item.id}:${moving.type}`}
    <InventoryMovementSlot
      type={moving.type}
      item={moving.item}
      onClose={() => (moving = null)}
    />
  {/key}
{/if}
