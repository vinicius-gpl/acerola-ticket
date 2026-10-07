<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useMaintenanceQuoteListModel,
    type MaintenanceQuoteListModel,
  } from './use-maintenance-quote-list.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste.
   */
  let { onReady }: { onReady: (model: MaintenanceQuoteListModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useMaintenanceQuoteListModel());
</script>
