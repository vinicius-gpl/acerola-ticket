<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  import { useInventoryFormModel, type InventoryFormModel } from './use-inventory-form.svelte';

  /**
   * O formulário precisa de um `QueryClient` no contexto (ele invalida a lista ao salvar).
   * Este apoio monta o model e o entrega ao teste.
   */
  let {
    item,
    onSaved,
    onReady,
  }: {
    item: InventoryItem | null;
    onSaved: () => void;
    onReady: (model: InventoryFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  /* O model fotografa o produto na montagem — é o mesmo gesto da rota. */
  // svelte-ignore state_referenced_locally
  onReady(useInventoryFormModel({ item, onSaved }));
</script>
