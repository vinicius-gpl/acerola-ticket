<script lang="ts" module>
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A ponte entre a fila e o atendimento.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * atendimento precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type TicketAnswerSlotProps = {
    ticket: Ticket;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import TicketAnswerDialog from '$lib/components/ticket-answer-dialog/ticket-answer-dialog.svelte';
  import { useTicketAnswerModel } from '$lib/hooks/use-ticket-answer/use-ticket-answer.svelte';

  let { ticket, onClose }: TicketAnswerSlotProps = $props();

  /* O compilador avisa que isto lê `ticket` e `onClose` só uma vez — e é exatamente o que se
     quer. O formulário fotografa o chamado na montagem e não acompanha mudanças dele: quem
     troca de chamado é o `{#key}` da rota, que monta este componente de novo. Acompanhar
     apagaria o que quem atende está digitando quando a fila recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const answer = useTicketAnswerModel({ ticket, onSaved: onClose });
</script>

<TicketAnswerDialog
  data={answer.data}
  state={{ ...answer.state, isOpen: true }}
  actions={{
    ...answer.actions,
    onClose: () => (answer.state.isSubmitting ? undefined : onClose()),
  }}
/>
