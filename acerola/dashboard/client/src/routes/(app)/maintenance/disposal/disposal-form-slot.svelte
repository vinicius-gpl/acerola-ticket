<script lang="ts" module>
  /**
   * A ponte entre a tela de Descarte e o formulário de registrar um.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   *
   * Aqui o produto NÃO vem escolhido: o descarte começa pela pergunta "o que foi?", e é o
   * formulário quem lista os produtos.
   */
  export type DisposalFormSlotProps = { onClose: () => void };
</script>

<script lang="ts">
  import InventoryMovementDialog from '$lib/components/acerola-inventory-movement-dialog/acerola-inventory-movement-dialog.svelte';
  import { useInventoryMovementFormModel } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';

  let { onClose }: DisposalFormSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const form = useInventoryMovementFormModel({ type: 'disposal', item: null, onSaved: onClose });
</script>

<InventoryMovementDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
