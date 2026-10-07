<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useTicketDetailModel, type TicketDetailModel } from './use-ticket-detail.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { id, onReady }: { id: number; onReady: (model: TicketDetailModel) => void } = $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketDetailModel(id));
</script>
