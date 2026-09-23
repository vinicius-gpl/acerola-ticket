<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useComputerListModel, type ComputerListModel } from './use-computer-list.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste, que então
   * trabalha com ele como a tela trabalharia.
   */
  let { onReady }: { onReady: (model: ComputerListModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useComputerListModel());
</script>
