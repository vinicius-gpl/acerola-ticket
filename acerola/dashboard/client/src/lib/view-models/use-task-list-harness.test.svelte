<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

  import Inner from './use-task-list-model.test.svelte';
  import { type TaskListModel } from './use-task-list.model.svelte';

  /**
   * View-model com consulta só existe dentro de um componente, e dentro do provider — é dele
   * que vêm o QueryClient e as opções padrão. O provider fica POR FORA porque contexto
   * definido e lido no mesmo componente não alcança as opções da consulta.
   */
  let { onReady }: { onReady: (model: TaskListModel) => void } = $props();

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
</script>

<QueryClientProvider client={queryClient}>
  <Inner {onReady} />
</QueryClientProvider>
