<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useTicketLookupModel, type TicketLookupModel } from './use-ticket-lookup.svelte';

  /** Mesmo apoio do `use-ticket-list`: o model precisa de um componente para existir. */
  let { onReady }: { onReady: (model: TicketLookupModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useTicketLookupModel());
</script>
