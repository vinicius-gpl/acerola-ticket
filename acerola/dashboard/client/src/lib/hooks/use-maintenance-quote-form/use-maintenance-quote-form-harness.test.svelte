<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  import {
    useMaintenanceQuoteFormModel,
    type MaintenanceQuoteFormModel,
  } from './use-maintenance-quote-form.svelte';

  /**
   * O formulário precisa de um `QueryClient` no contexto (ele invalida a lista ao salvar).
   * Este apoio monta o model e o entrega ao teste.
   */
  let {
    quote,
    onSaved,
    onReady,
  }: {
    quote: MaintenanceQuote | null;
    onSaved: () => void;
    onReady: (model: MaintenanceQuoteFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  /* O model fotografa o orçamento na montagem — é o mesmo gesto da rota. */
  // svelte-ignore state_referenced_locally
  onReady(useMaintenanceQuoteFormModel({ quote, onSaved }));
</script>
