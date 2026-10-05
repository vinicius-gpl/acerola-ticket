<script lang="ts" module>
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A ponte entre a ficha do chamado e o formulário de novo histórico.
   *
   * Existe como componente separado, e dentro de `routes/`, porque o view-model do formulário
   * precisa nascer junto com ele (e morrer com ele), e componente não pode buscar o próprio
   * dado — é a regra que o ESLint cobra ali.
   */
  export type TicketHistoryFormSlotProps = { ticket: Ticket };
</script>

<script lang="ts">
  import TicketHistoryForm from '../components/acerola-ticket-history-form/acerola-ticket-history-form.svelte';
  import { useTicketHistoryFormModel } from '$lib/hooks/use-ticket-history-form/use-ticket-history-form.svelte';

  let { ticket }: TicketHistoryFormSlotProps = $props();

  /* O compilador avisa que isto lê `ticket` só uma vez — e é o que se quer. As opções de tipo
     dependem do ESTÁGIO do chamado, e quem troca de estágio é o `{#key}` da rota, que monta
     este componente de novo. Acompanhar por efeito apagaria o que quem atende está digitando
     quando a ficha recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const form = useTicketHistoryFormModel({ ticket });
</script>

<TicketHistoryForm data={form.data} state={form.state} actions={form.actions} />
