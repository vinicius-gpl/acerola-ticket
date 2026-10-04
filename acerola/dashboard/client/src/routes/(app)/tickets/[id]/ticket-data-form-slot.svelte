<script lang="ts" module>
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A ponte entre a ficha do chamado e o formulário de dados — pelo mesmo motivo do
   * `ticket-history-form-slot`: o view-model nasce e morre com o formulário.
   */
  export type TicketDataFormSlotProps = { ticket: Ticket };
</script>

<script lang="ts">
  import TicketDataForm from '../components/acerola-ticket-data-form/acerola-ticket-data-form.svelte';
  import { useTicketDataFormModel } from '$lib/hooks/use-ticket-data-form/use-ticket-data-form.svelte';

  let { ticket }: TicketDataFormSlotProps = $props();

  /* Lê `ticket` só uma vez, de propósito: o formulário fotografa o chamado na montagem. Quem
     troca de chamado é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useTicketDataFormModel({ ticket });
</script>

<TicketDataForm data={form.data} state={form.state} actions={form.actions} />
