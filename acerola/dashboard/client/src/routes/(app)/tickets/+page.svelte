<script lang="ts">
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import TicketListView from '$lib/components/ticket-list-view/ticket-list-view.svelte';
  import { useTicketListModel } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
  import TicketAnswerSlot from './ticket-answer-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Qual chamado está sendo atendido é o único estado que mora aqui, porque é ele que liga a
   * fila ao formulário — e ele não é dado, é qual peça da tela está na frente.
   */
  const list = useTicketListModel();

  let answering = $state<Ticket | null>(null);
</script>

<svelte:head>
  <title>Chamados</title>
</svelte:head>

<TicketListView
  data={list.data}
  state={list.state}
  actions={{ ...list.actions, onAnswer: (ticket: Ticket) => (answering = ticket) }}
/>

<!-- `{#key}` pelo id: trocar de chamado monta um formulário NOVO, com os valores dele. -->
{#if answering}
  {#key answering.id}
    <TicketAnswerSlot ticket={answering} onClose={() => (answering = null)} />
  {/key}
{/if}
