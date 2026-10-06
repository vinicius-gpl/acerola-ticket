<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type StockMovementType } from '@template/shared/domain/inventory-stock.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  import {
    useInventoryMovementFormModel,
    type InventoryMovementFormModel,
  } from './use-inventory-movement-form.svelte';

  /**
   * O formulário precisa de um `QueryClient` no contexto (ele busca os produtos e invalida o
   * depósito ao salvar). Este apoio monta o model e o entrega ao teste.
   */
  let {
    type,
    item,
    onSaved,
    onReady,
  }: {
    type: StockMovementType;
    item: InventoryItem | null;
    onSaved: () => void;
    onReady: (model: InventoryMovementFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  /* O model fotografa o produto e o tipo na montagem — é o mesmo gesto da rota. */
  // svelte-ignore state_referenced_locally
  onReady(useInventoryMovementFormModel({ type, item, onSaved }));
</script>
