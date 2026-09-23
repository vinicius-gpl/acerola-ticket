<script lang="ts" module>
  import { type Part } from '@template/shared/schemas/part.schema';

  /** A ponte entre a tela e o extrato da peça. Mesma razão do `part-form-slot`. */
  export type PartLedgerSlotProps = {
    part: Part;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import PartLedgerDialog from '$lib/components/part-ledger-dialog/part-ledger-dialog.svelte';
  import { usePartLedgerModel } from '$lib/hooks/use-part-ledger/use-part-ledger.svelte';

  let { part, onClose }: PartLedgerSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const ledger = usePartLedgerModel({ part });
</script>

<PartLedgerDialog
  data={ledger.data}
  state={{ ...ledger.state, isOpen: true }}
  actions={{ ...ledger.actions, onClose }}
/>
