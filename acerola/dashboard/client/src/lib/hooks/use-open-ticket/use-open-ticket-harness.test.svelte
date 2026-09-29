<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useOpenTicketModel, type OpenTicketModel } from './use-open-ticket.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { onReady }: { onReady: (model: OpenTicketModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useOpenTicketModel());
</script>
