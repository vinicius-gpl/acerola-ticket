<script lang="ts" module>
  import { type Computer } from '@template/shared/schemas/computer.schema';

  /**
   * A ponte entre a ficha e o formulário de transferência.
   *
   * O view-model do formulário só existe dentro de um componente (é dali que vêm o
   * QueryClient e o ciclo de vida da busca), e ele precisa nascer e morrer junto com o
   * diálogo — senão a segunda transferência abriria com as escolhas da primeira.
   */
  export type TransferFormSlotProps = {
    computer: Computer;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import TransferDialog from '$lib/components/transfer-dialog/transfer-dialog.svelte';
  import { useTransferFormModel } from '$lib/hooks/use-transfer-form/use-transfer-form.svelte';

  let { computer, onClose }: TransferFormSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const form = useTransferFormModel({ computer, onSaved: onClose });
</script>

<TransferDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
