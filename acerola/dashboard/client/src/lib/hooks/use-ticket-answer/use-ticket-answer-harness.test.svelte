<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { useTicketAnswerModel, type TicketAnswerModel } from './use-ticket-answer.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let {
    ticket,
    onSaved,
    onReady,
  }: {
    ticket: Ticket;
    onSaved: () => void;
    onReady: (model: TicketAnswerModel) => void;
  } = $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  onReady(useTicketAnswerModel({ ticket, onSaved }));
</script>
