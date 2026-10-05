<script lang="ts" module>
  import { type StockMovementType } from '@template/shared/domain/inventory-stock.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  /**
   * A ponte entre a tela do Depósito e o formulário de entrada ou saída.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type InventoryMovementSlotProps = {
    type: StockMovementType;
    item: InventoryItem;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import InventoryMovementDialog from '$lib/components/acerola-inventory-movement-dialog/acerola-inventory-movement-dialog.svelte';
  import { useInventoryMovementFormModel } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';

  let { type, item, onClose }: InventoryMovementSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é o que se quer: o formulário
     fotografa o produto e o tipo na montagem. Quem troca é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useInventoryMovementFormModel({ type, item, onSaved: onClose });
</script>

<InventoryMovementDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
