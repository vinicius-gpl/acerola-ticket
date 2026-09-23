<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Part } from '@template/shared/schemas/part.schema';

  import { usePartLedgerModel, type PartLedgerModel } from './use-part-ledger.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let { part, onReady }: { part: Part; onReady: (model: PartLedgerModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(usePartLedgerModel({ part }));
</script>
