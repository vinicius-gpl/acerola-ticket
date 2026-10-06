<script lang="ts" module>
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  /**
   * A ponte entre a tela e o formulário de produto.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type InventoryFormSlotProps = {
    item: InventoryItem | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import InventoryFormDialog from '$lib/components/acerola-inventory-form-dialog/acerola-inventory-form-dialog.svelte';
  import { useInventoryFormModel } from '$lib/hooks/use-inventory-form/use-inventory-form.svelte';

  let { item, onClose }: InventoryFormSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é o que se quer: o formulário
     fotografa o produto na montagem. Quem troca de produto é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useInventoryFormModel({ item, onSaved: onClose });
</script>

<InventoryFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
