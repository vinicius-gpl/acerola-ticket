<script lang="ts" module>
  import { type MovementType } from '@template/shared/domain/part-catalog.util';
  import { type Part } from '@template/shared/schemas/part.schema';

  /** A ponte entre a tela e o formulário de entrada/saída. Mesma razão do `part-form-slot`. */
  export type MovementFormSlotProps = {
    part: Part;
    type: MovementType;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import MovementFormDialog from '$lib/components/movement-form-dialog/movement-form-dialog.svelte';
  import { useMovementFormModel } from '$lib/hooks/use-movement-form/use-movement-form.svelte';

  let { part, type, onClose }: MovementFormSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const form = useMovementFormModel({ part, type, onSaved: onClose });
</script>

<MovementFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
