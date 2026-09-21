<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useTaskListModel, type TaskListModel } from './use-task-list.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste, que então
   * trabalha com ele como a tela trabalharia.
   */
  let { onReady }: { onReady: (model: TaskListModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useTaskListModel());
</script>
