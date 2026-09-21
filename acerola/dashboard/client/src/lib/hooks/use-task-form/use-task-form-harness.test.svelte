<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Task } from '@template/shared/schemas/task.schema';

  import { useTaskFormModel, type TaskFormModel } from './use-task-form.svelte';

  /** Mesma ideia do use-task-list-harness. */
  let {
    task,
    onSaved,
    onReady,
  }: {
    task: Task | null;
    onSaved: () => void;
    onReady: (model: TaskFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useTaskFormModel({ task, onSaved }));
</script>
