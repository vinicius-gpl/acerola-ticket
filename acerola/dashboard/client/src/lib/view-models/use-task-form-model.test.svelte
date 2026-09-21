<script lang="ts">
  import { type Task } from '@template/shared/schemas/task.schema';

  import { useTaskFormModel, type TaskFormModel } from './use-task-form.model.svelte';

  let {
    task,
    onSaved,
    onReady,
  }: {
    task: Task | null;
    onSaved: () => void;
    onReady: (model: TaskFormModel) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  onReady(useTaskFormModel({ task, onSaved }));
</script>
