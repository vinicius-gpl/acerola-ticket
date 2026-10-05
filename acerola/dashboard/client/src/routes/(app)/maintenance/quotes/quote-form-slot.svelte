<script lang="ts" module>
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  /**
   * A ponte entre a tela e o formulário de orçamento.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type QuoteFormSlotProps = {
    quote: MaintenanceQuote | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import QuoteFormDialog from '$lib/components/acerola-quote-form-dialog/acerola-quote-form-dialog.svelte';
  import { useMaintenanceQuoteFormModel } from '$lib/hooks/use-maintenance-quote-form/use-maintenance-quote-form.svelte';

  let { quote, onClose }: QuoteFormSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é o que se quer: o formulário
     fotografa o orçamento na montagem. Quem troca de orçamento é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useMaintenanceQuoteFormModel({ quote, onSaved: onClose });
</script>

<QuoteFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
