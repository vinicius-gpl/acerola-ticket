<script lang="ts">
  import { useTaskListModel, type TaskListModel } from './use-task-list.model.svelte';

  let { onReady }: { onReady: (model: TaskListModel) => void } = $props();

  onReady(useTaskListModel());
</script>
