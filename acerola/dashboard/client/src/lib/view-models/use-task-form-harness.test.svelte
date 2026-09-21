<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { type Task } from '@template/shared/schemas/task.schema';

  import Inner from './use-task-form-model.test.svelte';
  import { type TaskFormModel } from './use-task-form.model.svelte';

  /** Mesma ideia do use-task-list-harness: provider por fora, model dentro. */
  let {
    task,
    onSaved,
    onReady,
  }: {
    task: Task | null;
    onSaved: () => void;
    onReady: (model: TaskFormModel) => void;
  } = $props();

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
</script>

<QueryClientProvider client={queryClient}>
  <Inner {task} {onSaved} {onReady} />
</QueryClientProvider>
