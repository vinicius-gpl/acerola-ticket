<script lang="ts">
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import TicketListView from './components/acerola-ticket-list-view/acerola-ticket-list-view.svelte';
  import { useTicketListModel } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
  import TicketAnswerSlot from './ticket-answer-slot.svelte';
  import type { PageData } from './$types';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Qual chamado está sendo atendido é o único estado que mora aqui, porque é ele que liga a
   * fila ao formulário — e ele não é dado, é qual peça da tela está na frente.
   */
  const list = useTicketListModel();

  /* `data.user` vem da guarda do layout (`(app)/+layout.ts`): é quem está logado. O nome dele
     já entra em "quem está atendendo" ao abrir um chamado que ninguém assumiu. */
  let { data }: { data: PageData } = $props();

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
    <TicketAnswerSlot
      ticket={answering}
      attendantName={data.user.name}
      onClose={() => (answering = null)}
    />
  {/key}
{/if}
