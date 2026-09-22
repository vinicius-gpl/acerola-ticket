<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useTicketListModel, type TicketListModel } from './use-ticket-list.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste, que então
   * trabalha com ele como a tela trabalharia.
   */
  let { onReady }: { onReady: (model: TicketListModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useTicketListModel());
</script>
