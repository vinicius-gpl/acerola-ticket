<script lang="ts">
  import { goto } from '$app/navigation';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import TicketListView from '$lib/components/acerola-ticket-list-view/acerola-ticket-list-view.svelte';
  import { useTicketListModel } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Abrir um chamado é NAVEGAR para a ficha dele (`/maintenance/tickets/7`), e não abrir um diálogo por
   * cima da fila: a ficha tem a linha do tempo inteira, e tem endereço para ser apontada.
   */
  const list = useTicketListModel({ area: 'manutencao' });
</script>

<svelte:head>
  <title>Chamados</title>
</svelte:head>

<TicketListView
  data={list.data}
  state={list.state}
  actions={{ ...list.actions, onAnswer: (ticket: Ticket) => void goto(`/maintenance/tickets/${ticket.id}`) }}
/>
