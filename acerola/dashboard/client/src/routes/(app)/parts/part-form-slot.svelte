<script lang="ts" module>
  import { type Part } from '@template/shared/schemas/part.schema';

  /**
   * A ponte entre a tela e o formulário de peça.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type PartFormSlotProps = {
    part: Part | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import PartFormDialog from '$lib/components/part-form-dialog/part-form-dialog.svelte';
  import { usePartFormModel } from '$lib/hooks/use-part-form/use-part-form.svelte';

  let { part, onClose }: PartFormSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é o que se quer: o formulário
     fotografa a peça na montagem. Quem troca de peça é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = usePartFormModel({ part, onSaved: onClose });
</script>

<PartFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
