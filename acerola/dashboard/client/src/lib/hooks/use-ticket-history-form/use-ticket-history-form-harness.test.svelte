<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import {
    useTicketHistoryFormModel,
    type TicketHistoryFormModel,
  } from './use-ticket-history-form.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let {
    ticket,
    onRecorded,
    onReady,
  }: {
    ticket: Ticket;
    onRecorded: () => void;
    onReady: (model: TicketHistoryFormModel) => void;
  } = $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketHistoryFormModel({ ticket, onRecorded }));
</script>
